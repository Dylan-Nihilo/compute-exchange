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
export const NIGHT_BOOKING_HORIZON_DAYS = 30;

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
 * docs/26 stores `card_split_options` as a "1,2,4,8" string; the API shape is not pinned down,
 * so both the string and an array form are accepted. Unknown values are dropped.
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

export function serializeCardSplitOptions(options: readonly number[]) {
  return cardSplitOptions.filter((option) => options.includes(option)).join(",");
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

// ===== Market availability, quote and night calendar (docs/26 §26.9) =====

const availabilitySchema = z.object({
  available: z.boolean(),
  reason: z.string().nullable().optional(),
  quote: z
    .object({
      unit_price: z.number().int().nonnegative(),
      total_amount: z.number().int().nonnegative(),
      platform_fee: z.number().int().nonnegative(),
      fee_rate: z.number().int().min(0).max(10000),
    })
    .nullable()
    .optional(),
  lease_preview: z
    .object({start_at: z.string().nullable(), end_at: z.string().nullable()})
    .nullable()
    .optional(),
});
export type ProductAvailabilityQuote = z.infer<typeof availabilitySchema>;

export interface AvailabilityQuery {
  pricingMode: RentalPricingMode;
  cards: number;
  duration: number;
  nightStartDate?: string;
}

export function fetchProductAvailability(
  productId: string,
  query: AvailabilityQuery,
  fetchImplementation: typeof fetch = fetch,
) {
  if (!/^[1-9]\d*$/.test(productId)) throw new Error("商品编号无效");
  const params = new URLSearchParams({
    pricing_mode: query.pricingMode,
    cards: String(query.cards),
    duration: String(query.duration),
  });
  if (query.nightStartDate) params.set("night_start_date", query.nightStartDate);
  return requestEnvelope(`/api/market-proxy/products/${productId}/availability?${params}`, availabilitySchema, {
    fallback: "余量与报价读取失败",
    unavailable: "报价服务暂不可用",
    fetchImplementation,
  });
}

const nightCalendarSchema = z
  .array(z.object({night_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), max_cards: z.number().int().nonnegative()}))
  .nullable()
  .transform((value) => value ?? []);
export type NightCalendarDay = {night_date: string; max_cards: number};

export function fetchNightCalendar(
  productId: string,
  {cards, from, days = NIGHT_BOOKING_HORIZON_DAYS}: {cards: number; from: string; days?: number},
  fetchImplementation: typeof fetch = fetch,
): Promise<NightCalendarDay[]> {
  if (!/^[1-9]\d*$/.test(productId)) throw new Error("商品编号无效");
  const params = new URLSearchParams({
    cards: String(cards),
    from,
    days: String(Math.min(Math.max(days, 1), NIGHT_BOOKING_HORIZON_DAYS)),
  });
  return requestEnvelope(`/api/market-proxy/products/${productId}/night-calendar?${params}`, nightCalendarSchema, {
    fallback: "包夜日历读取失败",
    unavailable: "包夜日历暂不可用",
    fetchImplementation,
  });
}

/** Today's date in Asia/Shanghai as YYYY-MM-DD. */
export function shanghaiDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Shanghai",
    year: "numeric",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year!, month! - 1, day! + days));
  return value.toISOString().slice(0, 10);
}
