import {z} from "zod";

import {requestEnvelope} from "./api/envelope.ts";
import {cardSplitOptions, isCardSplitOption, type CardSplitOption} from "./domain/contracts.ts";

// v1.2 flexible pricing, card split and nightly rental (tokenFactory docs/26).

export const rentalPricingModes = ["hourly", "daily", "weekly", "monthly", "nightly"] as const;
export type RentalPricingMode = (typeof rentalPricingModes)[number];

export const rentalPricingModeLabels: Record<RentalPricingMode, string> = {
  hourly: "按小时",
  daily: "按天",
  weekly: "按周",
  monthly: "按月",
  nightly: "包夜",
};

/** Unit of one billing period; `duration` is always a count of these. */
export const rentalPeriodUnits: Record<RentalPricingMode, string> = {
  hourly: "小时",
  daily: "天",
  weekly: "周",
  monthly: "月",
  nightly: "晚",
};

/** Backend `maxDurationByPricingMode` (compute/service.go) plus `nightly: 31` (docs/26 §26.4). */
export const maxDurationByPricingMode: Record<RentalPricingMode, number> = {
  hourly: 87_600,
  daily: 3650,
  weekly: 520,
  monthly: 120,
  nightly: 31,
};

export function isRentalPricingMode(value: unknown): value is RentalPricingMode {
  return typeof value === "string" && (rentalPricingModes as readonly string[]).includes(value);
}

export const DEFAULT_NIGHT_START_MIN = 22 * 60;
export const DEFAULT_NIGHT_END_MIN = 8 * 60;

export function formatMinuteOfDay(minute: number) {
  const hours = Math.floor(minute / 60);
  const minutes = minute % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Window length in minutes; `end <= start` means the window ends on the next day. */
export function nightWindowMinutes(startMin: number, endMin: number) {
  return endMin > startMin ? endMin - startMin : endMin + 1440 - startMin;
}

export function formatNightWindow(startMin: number, endMin: number) {
  const nextDay = endMin <= startMin ? "次日 " : "";
  return `${formatMinuteOfDay(startMin)}–${nextDay}${formatMinuteOfDay(endMin)}（北京时间）`;
}

/** Mirrors docs/26 §26.6.1: 0–1439, 30-minute aligned, 4–14 hours long. */
export function validateNightWindow(startMin: number, endMin: number): string | null {
  for (const value of [startMin, endMin]) {
    if (!Number.isInteger(value) || value < 0 || value > 1439) return "夜间窗口时间无效";
    if (value % 30 !== 0) return "夜间窗口需按 30 分钟对齐";
  }
  const length = nightWindowMinutes(startMin, endMin);
  if (length < 4 * 60 || length > 14 * 60) return "夜间窗口时长需在 4 到 14 小时之间";
  return null;
}

/** Half-hour options for the night window pickers. */
export const halfHourOptions = Array.from({length: 48}, (_, index) => index * 30);

/**
 * The API returns `card_split_options` as an ascending int array (null for non-split products);
 * the DB stores "1,2,4,8", so the string form is still tolerated. Unknown values are dropped.
 */
export function parseCardSplitOptions(value: unknown): CardSplitOption[] {
  const raw: unknown[] =
    typeof value === "string"
      ? value.split(",").map((item) => Number(item.trim()))
      : Array.isArray(value)
        ? value
        : [];
  const options = new Set<CardSplitOption>();
  for (const item of raw) {
    if (typeof item === "number" && isCardSplitOption(item)) options.add(item);
  }
  return cardSplitOptions.filter((option) => options.has(option));
}

/** Request form for POST/PUT /supplier/products: `card_split_options` is `[]int` (compute CreateProductReq). */
export function serializeCardSplitOptions(options: readonly number[]): CardSplitOption[] {
  return cardSplitOptions.filter((option) => options.includes(option));
}

export const productPriceSchema = z.object({
  pricing_mode: z.string(),
  unit_price: z.number().int().nonnegative(),
  min_duration: z.number().int().positive().optional(),
  enabled: z.boolean().optional(),
});
export type ProductPriceRow = z.infer<typeof productPriceSchema>;

export interface RentalPrice {
  pricingMode: RentalPricingMode;
  unitPriceMinor: number;
  minDuration: number;
}

/** Enabled prices in canonical period order; disabled or unknown modes are omitted. */
export function enabledRentalPrices(rows: readonly ProductPriceRow[] | null | undefined): RentalPrice[] {
  const prices = (rows ?? [])
    .filter((row) => row.enabled !== false && isRentalPricingMode(row.pricing_mode))
    .map((row) => ({
      pricingMode: row.pricing_mode as RentalPricingMode,
      unitPriceMinor: row.unit_price,
      minDuration: row.min_duration ?? 1,
    }));
  return rentalPricingModes.flatMap((mode) => prices.filter((price) => price.pricingMode === mode).slice(0, 1));
}

// ===== Market availability and quote (compute-api.md GET /products/:id/availability, T-093) =====

export const leaseStartRules = ["on_activation", "on_buyer_confirm"] as const;
export type LeaseStartRule = (typeof leaseStartRules)[number];

const availabilitySchema = z.object({
  available: z.boolean(),
  // Display-ready Chinese reason when `available=false`, "" otherwise.
  reason: z.string(),
  // Same QuoteOrder result POST /orders will charge; null only for nightly (S4 not wired).
  quote: z
    .object({
      pricing_mode: z.string(),
      unit_price: z.number().int().nonnegative(),
      quantity: z.number().int().positive(),
      duration: z.number().int().positive(),
      total_amount: z.number().int().nonnegative(),
      platform_fee: z.number().int().nonnegative(),
      fee_rate: z.number().int().min(0).max(10000),
    })
    .nullable(),
  lease_preview: z
    .object({start_rule: z.enum(leaseStartRules), start_at: z.string().nullable(), end_at: z.string().nullable()})
    .nullable(),
});
export type ProductAvailabilityQuote = z.infer<typeof availabilitySchema>;

export interface AvailabilityQuery {
  /** Omitted for legacy single-price products: the backend then uses the display price mode. */
  pricingMode?: string;
  cards: number;
  duration: number;
}

export function fetchProductAvailability(
  productId: string,
  query: AvailabilityQuery,
  fetchImplementation: typeof fetch = fetch,
) {
  if (!/^[1-9]\d*$/.test(productId)) throw new Error("商品编号无效");
  const params = new URLSearchParams();
  if (query.pricingMode) params.set("pricing_mode", query.pricingMode);
  params.set("cards", String(query.cards));
  params.set("duration", String(query.duration));
  return requestEnvelope(`/api/market-proxy/products/${productId}/availability?${params}`, availabilitySchema, {
    fallback: "余量与报价读取失败",
    unavailable: "报价服务暂不可用",
    fetchImplementation,
  });
}

/** How the lease term starts, per `lease_preview.start_rule`. */
export function leaseStartRuleText(rule: LeaseStartRule) {
  return rule === "on_activation"
    ? "租期从平台开通并自检通过时起算，开通耗时不计入租期"
    : "租期从你确认签收供给方交付的凭证时起算";
}

export interface CheckoutAmounts {
  /**
   * quote: the backend availability quote (what POST /orders will charge);
   * estimate: local calculation, shown only while the quote is loading or the quote endpoint failed;
   * none: the backend answered without a quote (nightly not open) or nothing can be computed.
   */
  source: "quote" | "estimate" | "none";
  totalMinor?: number;
  feeMinor?: number;
  feeRate?: number;
}

/** Which amounts the checkout shows: the backend quote wins whenever it exists, even if unavailable. */
export function resolveCheckoutAmounts(
  availability: ProductAvailabilityQuote | undefined,
  estimate: {totalMinor: number; feeMinor: number; feeRate: number} | null,
): CheckoutAmounts {
  if (availability?.quote) {
    const {total_amount, platform_fee, fee_rate} = availability.quote;
    return {source: "quote", totalMinor: total_amount, feeMinor: platform_fee, feeRate: fee_rate};
  }
  if (availability || !estimate) return {source: "none"};
  return {source: "estimate", ...estimate};
}
