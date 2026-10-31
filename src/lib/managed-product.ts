import {
  enabledRentalPrices,
  formatNightWindow,
  parseCardSplitOptions,
  rentalPricingModeLabels,
  serializeCardSplitOptions,
  validateNightWindow,
  DEFAULT_NIGHT_END_MIN,
  DEFAULT_NIGHT_START_MIN,
  type RentalPricingMode,
} from "./flexible-pricing.ts";
import {isBackendRequestError} from "./api/envelope.ts";
import type {CreateProductInput, SupplierProduct} from "./supplier-workspace.ts";

// Supplier-side form state for v1.2 managed card rental products (docs/26 §26.3, §26.5, §26.6).

export const fulltimeModes = ["hourly", "daily", "weekly", "monthly"] as const satisfies readonly RentalPricingMode[];

export type PriceRowState = {enabled: boolean; price: string; minDuration: string};

export type ManagedProductState = {
  fulfillmentMode: "manual" | "managed";
  availability: "fulltime" | "night_window";
  nightStartMin: number;
  nightEndMin: number;
  splitOptions: number[];
  prices: Record<RentalPricingMode, PriceRowState>;
};

export type ManagedErrors = Partial<Record<"delivery" | "night" | "prices" | "split", string>>;

export const managedDeliveryModes = ["container", "bare_metal"] as const;

export function initialManagedState(product?: SupplierProduct): ManagedProductState {
  const rows = enabledRentalPrices(product?.prices ?? []);
  const prices = Object.fromEntries(
    (["hourly", "daily", "weekly", "monthly", "nightly"] as const).map((mode) => {
      const row = rows.find((price) => price.pricingMode === mode);
      const legacy = !rows.length && product?.pricing_mode === mode;
      return [mode, {
        enabled: Boolean(row) || legacy,
        price: row ? String(row.unitPriceMinor / 100) : legacy && product ? String(product.unit_price / 100) : "",
        minDuration: String(row?.minDuration ?? (legacy ? product?.min_duration : undefined) ?? 1),
      }];
    }),
  ) as Record<RentalPricingMode, PriceRowState>;
  return {
    fulfillmentMode: product?.fulfillment_mode ?? "manual",
    availability: product?.availability ?? "fulltime",
    nightStartMin: product?.night_start_min ?? DEFAULT_NIGHT_START_MIN,
    nightEndMin: product?.night_end_min ?? DEFAULT_NIGHT_END_MIN,
    splitOptions: parseCardSplitOptions(product?.card_split_options),
    prices,
  };
}

const priceInputPattern = /^\d+(\.\d{1,2})?$/;

/** Validates the managed section and returns the extra payload, or the field errors. */
export function buildManagedPayload(
  state: ManagedProductState,
  {cardCount, deliveryMode}: {cardCount: number; deliveryMode: string},
): {errors: ManagedErrors} | {payload: Partial<CreateProductInput> & {pricing_mode: string; unit_price: number}} {
  const errors: ManagedErrors = {};
  if (!(managedDeliveryModes as readonly string[]).includes(deliveryMode)) {
    errors.delivery = "平台托管仅支持容器或裸金属交付";
  }
  const nightly = state.availability === "night_window";
  if (nightly) {
    // compute/nightly.go NightOrderWindow: nightly order/quote/calendar require container delivery (40001
    // otherwise), although product create does not check it (compute/pricing.go validateCardRentalPricing).
    const nightError = deliveryMode !== "container"
      ? "夜间窗口（包夜）仅支持分卡容器交付，请将交付方式改为容器"
      : validateNightWindow(state.nightStartMin, state.nightEndMin);
    if (nightError) errors.night = nightError;
  }
  const modes: readonly RentalPricingMode[] = nightly ? ["nightly"] : fulltimeModes;
  const enabled = modes.filter((mode) => state.prices[mode].enabled);
  if (!enabled.length) {
    errors.prices = nightly ? "请填写包夜单价" : "请至少启用一种计费方式";
  } else {
    for (const mode of enabled) {
      const row = state.prices[mode];
      const minDuration = Number(row.minDuration);
      if (!priceInputPattern.test(row.price) || Number(row.price) <= 0) {
        errors.prices = `请填写大于 0 的${rentalPricingModeLabels[mode]}单价（最多两位小数）`;
        break;
      }
      if (!Number.isInteger(minDuration) || minDuration < 1) {
        errors.prices = `${rentalPricingModeLabels[mode]}的最短租期需为正整数`;
        break;
      }
    }
  }
  const splitAllowed = deliveryMode === "container";
  if (splitAllowed) {
    if (!state.splitOptions.length) errors.split = "请至少选择一种可租卡数";
    else if (cardCount > 0 && state.splitOptions.some((option) => option > cardCount)) {
      errors.split = "可租卡数不能超过单台节点的卡数";
    }
  }
  if (Object.keys(errors).length) return {errors};

  const prices = modes.map((mode) => ({
    pricing_mode: mode,
    unit_price: state.prices[mode].enabled ? Math.round(Number(state.prices[mode].price) * 100) : 0,
    min_duration: Number(state.prices[mode].minDuration) || 1,
    enabled: state.prices[mode].enabled,
  })).filter((row) => row.enabled || row.unit_price > 0);
  // Top-level pricing_mode/unit_price mirror the shortest enabled period for legacy readers;
  // the backend ignores them when `prices` is present (docs/26 §26.9).
  const primary = prices.find((row) => row.enabled)!;
  return {
    payload: {
      fulfillment_mode: "managed",
      availability: state.availability,
      ...(nightly ? {night_start_min: state.nightStartMin, night_end_min: state.nightEndMin} : {}),
      ...(splitAllowed ? {card_split_options: serializeCardSplitOptions(state.splitOptions)} : {}),
      prices,
      pricing_mode: primary.pricing_mode,
      unit_price: primary.unit_price,
      min_duration: primary.min_duration,
      ...(nightly ? {available_hours: `每晚 ${formatNightWindow(state.nightStartMin, state.nightEndMin)}`} : {}),
    },
  };
}


/**
 * Managed products are created as `draft` (compute initialProductStatus) and only enter review once
 * a node has passed probing; a `draft` with a rejection reason is a product the operator sent back.
 */
export function isManagedDraftAwaitingSubmit(product: Pick<SupplierProduct, "fulfillment_mode" | "status" | "rejected_reason">) {
  return product.fulfillment_mode === "managed" && product.status === "draft" && !product.rejected_reason;
}

/**
 * Message for a failed create/resubmit. The managed gate (40001) already returns display-ready Chinese
 * (fleet disabled, no verified ssh node, per-node reasons, fulfillment mode immutable); the resubmit
 * status race comes back as the raw "product review conflict" (40900) and is translated here.
 */
export function productSubmitErrorMessage(error: unknown, fallback: string) {
  if (isBackendRequestError(error) && error.code === 40900 && /product review conflict/i.test(error.message)) {
    return "商品状态已变化：只有草稿或已下架的商品可以提交审核，请刷新商品列表后重试";
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
