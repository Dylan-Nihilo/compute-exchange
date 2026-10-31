import {z} from "zod";

import {requestEnvelope} from "./api/envelope.ts";
import {formatNightWindow} from "./flexible-pricing.ts";

// v1.2 包夜 (tokenFactory docs/26 §26.6, backend compute/nightly.go + compute/pricing.go NightWindow).
// night_date = 窗口开始那天的北京时间日期; 窗口分钟 0–1439, end <= start 表示跨零点。
// Asia/Shanghai 无夏令时, 这里按固定 UTC+8 计算, 与后端 shanghaiLoc() 口径一致。

const SHANGHAI_OFFSET_MS = 8 * 3600 * 1000;
const DAY_MS = 24 * 3600 * 1000;

/** compute/nightly.go: 当晚截止 = 窗口开始 + 2h; 起订不晚于今天 + 30 天; 最后一晚不晚于今天 + 60 天。 */
export const NIGHT_SAME_NIGHT_CUTOFF_MIN = 120;
export const NIGHT_START_AHEAD_DAYS = 30;
export const NIGHT_HORIZON_DAYS = 60;
/** maxDurationByPricingMode.nightly; backend PricingNightly 上限 31 晚。 */
export const NIGHT_MAX_NIGHTS = 31;
/**
 * compute/nightly.go NightCalendarMaxDays = NightStartAheadDays + 1 (integ 03b2673): 31 nights from today cover
 * every valid start night (today..today+30). Later nights only matter as follow-on nights of a span; the start
 * is still capped at today+30 by NightBookingBounds.lastStart.
 */
export const NIGHT_CALENDAR_MAX_DAYS = NIGHT_START_AHEAD_DAYS + 1;

export interface NightWindowMinutes {
  startMin: number;
  endMin: number;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(date: string) {
  if (!DATE_RE.test(date)) throw new Error(`无效日期 ${date}`);
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Beijing calendar date (YYYY-MM-DD) of an instant. */
export function shanghaiDate(now: Date | number = Date.now()) {
  return new Date(Number(now) + SHANGHAI_OFFSET_MS).toISOString().slice(0, 10);
}

/** Calendar addition on YYYY-MM-DD; month/year rollover handled by Date.UTC. */
export function addDays(date: string, days: number) {
  return new Date(parseDate(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (both YYYY-MM-DD). */
export function daysBetween(from: string, to: string) {
  return Math.round((parseDate(to) - parseDate(from)) / DAY_MS);
}

/** Leading YYYY-MM-DD of a backend date (`night_start_date` is a *time.Time, e.g. "2026-11-03T00:00:00+08:00"). */
export function nightDateString(value: string | null | undefined) {
  if (!value) return null;
  const head = value.slice(0, 10);
  return DATE_RE.test(head) ? head : null;
}

function crossesMidnight(window: NightWindowMinutes) {
  return window.endMin <= window.startMin;
}

/** Window start instant of the night `date` (pricing.go NightStartAt). */
export function nightStartAt(date: string, window: NightWindowMinutes) {
  return new Date(parseDate(date) - SHANGHAI_OFFSET_MS + window.startMin * 60_000);
}

/** Window end instant of the night `date`; +1 day when the window crosses midnight. */
export function nightEndAt(date: string, window: NightWindowMinutes) {
  const endDate = crossesMidnight(window) ? addDays(date, 1) : date;
  return new Date(parseDate(endDate) - SHANGHAI_OFFSET_MS + window.endMin * 60_000);
}

/** pricing.go NightlyLeaseEnd: window end of the last night. */
export function nightlyLeaseEnd(startDate: string, nights: number, window: NightWindowMinutes) {
  return nightEndAt(addDays(startDate, nights - 1), window);
}

/** pricing.go NightDateOf: the night an instant belongs to, or the first night after it. */
export function nightDateOf(now: Date | number, window: NightWindowMinutes) {
  const day = shanghaiDate(now);
  const tod = Math.floor(((Number(now) + SHANGHAI_OFFSET_MS) % DAY_MS) / 60_000);
  if (crossesMidnight(window) && tod < window.endMin) return addDays(day, -1);
  if (!crossesMidnight(window) && tod >= window.endMin) return addDays(day, 1);
  return day;
}

/** nightly.go FirstBookableNight: tonight stays bookable until window start + 2h. */
export function firstBookableNight(now: Date | number, window: NightWindowMinutes) {
  const night = nightDateOf(now, window);
  const cutoff = nightStartAt(night, window).getTime() + NIGHT_SAME_NIGHT_CUTOFF_MIN * 60_000;
  return Number(now) < cutoff ? night : addDays(night, 1);
}

export interface NightBookingBounds {
  /** First bookable night. */
  first: string;
  /** Latest allowed night_start_date (today + 30). */
  lastStart: string;
  /** Latest allowed last night (today + 60). */
  lastNight: string;
}

export function nightBookingBounds(now: Date | number, window: NightWindowMinutes): NightBookingBounds {
  const today = shanghaiDate(now);
  return {
    first: firstBookableNight(now, window),
    lastStart: addDays(today, NIGHT_START_AHEAD_DAYS),
    lastNight: addDays(today, NIGHT_HORIZON_DAYS),
  };
}

/** Most nights orderable from `start`: capped by 31 and by the today+60 horizon; 0 if `start` is out of range. */
export function maxNightsFrom(start: string, bounds: NightBookingBounds) {
  if (start < bounds.first || start > bounds.lastStart) return 0;
  return Math.max(0, Math.min(NIGHT_MAX_NIGHTS, daysBetween(start, bounds.lastNight) + 1));
}

// ===== GET /products/:id/night-calendar (compute/handler.go:198, nightly.go NightCalendar) =====

const nightCalendarSchema = z
  .array(z.object({night_date: z.string().regex(DATE_RE), max_cards: z.number().int().nonnegative()}))
  .nullable()
  .transform((value) => value ?? []);
export type NightCalendarDay = z.infer<typeof nightCalendarSchema>[number];

/**
 * Per-night maximum free cards on one node. `cards>0` zeroes nights that cannot hold that many;
 * nights before the first bookable night or past the horizon are 0. 40001 = 非包夜商品,
 * 40300 = managed 关闭, 50000 = 包夜模块未接入, 42900 = 与 availability 共用限流; all shown as-is.
 */
export function fetchNightCalendar(
  productId: string,
  {cards, from, days = NIGHT_CALENDAR_MAX_DAYS}: {cards: number; from?: string; days?: number},
  fetchImplementation: typeof fetch = fetch,
) {
  if (!/^[1-9]\d*$/.test(productId)) throw new Error("商品编号无效");
  const params = new URLSearchParams({cards: String(Math.max(0, Math.trunc(cards))), days: String(Math.min(NIGHT_CALENDAR_MAX_DAYS, Math.max(1, Math.trunc(days))))});
  if (from) params.set("from", from);
  return requestEnvelope(`/api/market-proxy/products/${productId}/night-calendar?${params}`, nightCalendarSchema, {
    fallback: "包夜日历读取失败",
    unavailable: "包夜日历暂不可用",
    fetchImplementation,
  });
}

/** A calendar night cannot start or be part of a booking for `cards` cards. */
export function isNightDisabled(day: NightCalendarDay, cards: number) {
  return day.max_cards < Math.max(1, cards);
}

/**
 * First night in [start, start+nights) that the calendar rules out, or null. The calendar is a per-night
 * snapshot only; "same cards every night" is decided by the availability quote, so null is necessary,
 * not sufficient. Nights missing from the calendar are treated as unknown (not blocking).
 */
export function firstBlockedNight(calendar: readonly NightCalendarDay[], start: string, nights: number, cards: number) {
  const byDate = new Map(calendar.map((day) => [day.night_date, day]));
  for (let i = 0; i < nights; i += 1) {
    const date = addDays(start, i);
    const day = byDate.get(date);
    if (day && isNightDisabled(day, cards)) return date;
  }
  return null;
}

// ===== Order-side nightly snapshot and progress (GET /orders/:id/nights, fleet nightly.go OrderNights) =====

export interface NightlyOrderSnapshot {
  nightStartDate: string;
  nights: number;
  window: NightWindowMinutes;
}

export type NightlyPhase = "before_first" | "in_window" | "opening" | "between" | "ended";

export interface NightRowTimes {
  window_start: string;
  window_end: string;
  state: string;
}

/**
 * Current phase from the backend's per-night rows. `next_window_start` is the earliest booked/active night whose
 * window has not ended (<= now while inside it). Inside a window the night is either `active` (container started,
 * login allowed) or still `booked` (unpark pending/retrying) → "opening".
 */
export function nightlyProgress(data: {next_window_start: string | null; nights: readonly NightRowTimes[]}, now: Date | number = Date.now()) {
  const at = Number(now);
  const current = data.nights.find((night) =>
    (night.state === "active" || night.state === "booked") && Date.parse(night.window_start) <= at && at < Date.parse(night.window_end)) ?? null;
  const completed = data.nights.filter((night) => Date.parse(night.window_end) <= at).length;
  const phase: NightlyPhase = current
    ? current.state === "active" ? "in_window" : "opening"
    : data.next_window_start === null ? "ended" : completed === 0 ? "before_first" : "between";
  return {
    phase,
    completed,
    total: data.nights.length,
    currentWindowEnd: current?.window_end ?? null,
    nextWindowStart: current ? null : data.next_window_start,
  };
}

// ===== Checkout gating and selection =====

/**
 * compute/nightly.go NightOrderWindow: nightly orders need a night window, managed fulfilment and
 * container delivery; anything else is rejected with 40001, so the option is hidden instead.
 */
export function isNightlyOrderable(product: {fulfillmentMode?: string | null; nightWindow?: NightWindowMinutes | null; deliveryModeCode?: string | null}) {
  return product.fulfillmentMode === "managed" && Boolean(product.nightWindow) && product.deliveryModeCode === "container";
}

/** Calendar night is a valid *start* for `cards` cards: inside the booking bounds and not ruled out by the calendar. */
export function isNightStartSelectable(day: NightCalendarDay, cards: number, bounds: NightBookingBounds) {
  return day.night_date >= bounds.first && day.night_date <= bounds.lastStart && !isNightDisabled(day, cards);
}

/**
 * Keeps the buyer's chosen start while it stays selectable, otherwise falls back to the first selectable
 * night. null when the calendar has no selectable night for this card count.
 */
export function resolveNightStart(calendar: readonly NightCalendarDay[], cards: number, bounds: NightBookingBounds, preferred: string | null) {
  const selectable = calendar.filter((day) => isNightStartSelectable(day, cards, bounds));
  if (preferred && selectable.some((day) => day.night_date === preferred)) return preferred;
  return selectable[0]?.night_date ?? null;
}

// ===== Buyer/supplier order snapshot =====

export interface NightlyOrderFields {
  duration: number;
  pricing_mode?: string | null;
  night_start_date?: string | null;
  night_start_min?: number | null;
  night_end_min?: number | null;
}

/**
 * `nightly`: the order's pricing-mode snapshot is nightly. `snapshot`: null when the night fields are missing
 * (data error on a nightly order); callers show an explicit error instead of guessing.
 */
export function nightlyOrderSnapshot(order: NightlyOrderFields, fallbackPricingMode?: string | null) {
  const nightly = (order.pricing_mode ?? fallbackPricingMode) === "nightly";
  const start = nightDateString(order.night_start_date);
  const snapshot: NightlyOrderSnapshot | null = nightly && start && order.night_start_min != null && order.night_end_min != null
    ? {nightStartDate: start, nights: order.duration, window: {startMin: order.night_start_min, endMin: order.night_end_min}}
    : null;
  return {nightly, snapshot};
}

/**
 * One-line nightly label for order rows (supplier list/modal). null for non-nightly orders; without the night
 * snapshot only the night count is shown (no guessed dates). Compensation nights have no supplier-side API.
 */
export function nightlyOrderSummary(order: NightlyOrderFields) {
  const {nightly, snapshot} = nightlyOrderSnapshot(order);
  if (!nightly) return null;
  if (!snapshot) return `包夜 · ${order.duration} 晚`;
  return `包夜 · ${snapshot.nightStartDate} 晚起 · 每晚 ${formatNightWindow(snapshot.window.startMin, snapshot.window.endMin)} · ${order.duration} 晚`;
}
