import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {BackendRequestError} from "./api/envelope.ts";
import {
  addDays,
  fetchNightCalendar,
  firstBlockedNight,
  firstBookableNight,
  isNightDisabled,
  isNightStartSelectable,
  isNightlyOrderable,
  maxNightsFrom,
  nightBookingBounds,
  nightDateOf,
  nightDateString,
  nightlyLeaseEnd,
  NIGHT_CALENDAR_MAX_DAYS,
  nightlyOrderSnapshot,
  nightlyProgress,
  resolveNightStart,
  shanghaiDate,
} from "./nightly.ts";

const W = {startMin: 1320, endMin: 480};
const at = (iso: string) => new Date(iso).getTime();

describe("nightly dates (Asia/Shanghai)", () => {
  it("formats Beijing dates and adds calendar days across month/year ends", () => {
    assert.equal(shanghaiDate(at("2026-11-01T16:30:00Z")), "2026-11-02");
    assert.equal(addDays("2026-11-30", 1), "2026-12-01");
    assert.equal(addDays("2026-12-31", 1), "2027-01-01");
    assert.equal(nightDateString("2026-11-03T00:00:00+08:00"), "2026-11-03");
    assert.equal(nightDateString(null), null);
  });

  it("assigns early-morning hours to the previous night for cross-midnight windows", () => {
    assert.equal(nightDateOf(at("2026-11-02T02:00:00+08:00"), W), "2026-11-01");
    assert.equal(nightDateOf(at("2026-11-02T12:00:00+08:00"), W), "2026-11-02");
    // Same-day window 01:00–06:00: after the window ends today's night is over → tomorrow.
    assert.equal(nightDateOf(at("2026-11-02T07:00:00+08:00"), {startMin: 60, endMin: 360}), "2026-11-03");
  });

  it("keeps tonight bookable until window start + 2h", () => {
    assert.equal(firstBookableNight(at("2026-11-01T10:00:00+08:00"), W), "2026-11-01");
    assert.equal(firstBookableNight(at("2026-11-01T23:59:00+08:00"), W), "2026-11-01");
    assert.equal(firstBookableNight(at("2026-11-02T00:00:00+08:00"), W), "2026-11-02");
  });

  it("ends the lease at the last night's window end", () => {
    assert.equal(nightlyLeaseEnd("2026-11-01", 3, W).toISOString(), "2026-11-04T00:00:00.000Z");
    assert.equal(nightlyLeaseEnd("2026-11-01", 1, {startMin: 60, endMin: 360}).toISOString(), "2026-10-31T22:00:00.000Z");
  });

  it("bounds the start to today+30 and the last night to today+60, max 31 nights", () => {
    const bounds = nightBookingBounds(at("2026-11-01T10:00:00+08:00"), W);
    assert.deepEqual(bounds, {first: "2026-11-01", lastStart: "2026-12-01", lastNight: "2026-12-31"});
    assert.equal(maxNightsFrom("2026-11-01", bounds), 31);
    assert.equal(maxNightsFrom("2026-12-01", bounds), 31);
    assert.equal(maxNightsFrom("2026-12-02", bounds), 0);
    assert.equal(maxNightsFrom("2026-10-31", bounds), 0);
  });
});

describe("night calendar", () => {
  const bounds = {first: "2026-11-01", lastStart: "2026-12-01", lastNight: "2026-12-31"};
  const calendar = [
    {night_date: "2026-11-01", max_cards: 0},
    {night_date: "2026-11-02", max_cards: 2},
    {night_date: "2026-11-03", max_cards: 8},
    {night_date: "2026-11-04", max_cards: 4},
  ];

  it("disables nights whose max_cards is below the chosen card count", () => {
    assert.equal(isNightDisabled(calendar[0], 0), true);
    assert.equal(isNightDisabled(calendar[1], 2), false);
    assert.equal(isNightDisabled(calendar[1], 4), true);
    assert.equal(isNightStartSelectable(calendar[2], 8, bounds), true);
    assert.equal(isNightStartSelectable(calendar[2], 8, {...bounds, first: "2026-11-04"}), false);
  });

  it("finds the first night in the range that cannot hold the cards", () => {
    assert.equal(firstBlockedNight(calendar, "2026-11-02", 3, 2), null);
    assert.equal(firstBlockedNight(calendar, "2026-11-02", 3, 4), "2026-11-02");
    assert.equal(firstBlockedNight(calendar, "2026-11-03", 2, 8), "2026-11-04");
    // Nights beyond the calendar are unknown, left to the availability quote.
    assert.equal(firstBlockedNight(calendar, "2026-11-04", 5, 4), null);
  });

  it("covers today..today+30 in one calendar request but never starts after today+30", () => {
    assert.equal(NIGHT_CALENDAR_MAX_DAYS, 31);
    const edge = [{night_date: "2026-12-01", max_cards: 8}, {night_date: "2026-12-02", max_cards: 8}];
    assert.equal(isNightStartSelectable(edge[0], 1, bounds), true);
    assert.equal(isNightStartSelectable(edge[1], 1, bounds), false);
    assert.equal(resolveNightStart(edge, 1, bounds, "2026-12-02"), "2026-12-01");
    // A later night still counts as a follow-on night of a span.
    assert.equal(firstBlockedNight([...edge, {night_date: "2026-12-03", max_cards: 0}], "2026-12-01", 3, 1), "2026-12-03");
  });

  it("keeps a still-selectable choice and otherwise falls back to the first selectable night", () => {
    assert.equal(resolveNightStart(calendar, 2, bounds, "2026-11-04"), "2026-11-04");
    assert.equal(resolveNightStart(calendar, 8, bounds, "2026-11-04"), "2026-11-03");
    assert.equal(resolveNightStart(calendar, 2, bounds, null), "2026-11-02");
    assert.equal(resolveNightStart(calendar, 16, bounds, null), null);
  });

  it("requests the proxied calendar and tolerates null data", async () => {
    let url = "";
    const days = await fetchNightCalendar("12", {cards: 0, from: "2026-11-01"}, async (input) => {
      url = String(input);
      return Response.json({code: 0, message: "success", data: null});
    });
    assert.equal(url, "/api/market-proxy/products/12/night-calendar?cards=0&days=31&from=2026-11-01");
    assert.deepEqual(days, []);
  });

  it("surfaces backend errors (e.g. nightly module not wired) unchanged", async () => {
    await assert.rejects(
      fetchNightCalendar("12", {cards: 2}, async () => Response.json({code: 50000, message: "包夜预订模块未接入"}, {status: 500})),
      (error: unknown) => error instanceof BackendRequestError && error.code === 50000 && /包夜预订模块未接入/.test(error.message),
    );
    assert.throws(() => fetchNightCalendar("x", {cards: 1}), /商品编号无效/);
  });
});

describe("nightly gating", () => {
  it("offers nightly only for managed container products with a night window", () => {
    assert.equal(isNightlyOrderable({fulfillmentMode: "managed", nightWindow: W, deliveryModeCode: "container"}), true);
    assert.equal(isNightlyOrderable({fulfillmentMode: "managed", nightWindow: W, deliveryModeCode: "bare_metal"}), false);
    assert.equal(isNightlyOrderable({fulfillmentMode: "manual", nightWindow: W, deliveryModeCode: "container"}), false);
    assert.equal(isNightlyOrderable({fulfillmentMode: "managed", deliveryModeCode: "container"}), false);
  });
});

describe("nightly progress from GET /orders/:id/nights", () => {
  const night = (date: string, next: string, state: string) => ({
    window_start: `${date}T22:00:00+08:00`, window_end: `${next}T08:00:00+08:00`, state,
  });
  const nights = [
    night("2026-11-01", "2026-11-02", "ended"),
    night("2026-11-02", "2026-11-03", "failed"),
    night("2026-11-03", "2026-11-04", "booked"),
    night("2026-11-04", "2026-11-05", "booked"),
  ];

  it("uses the backend next window between nights and counts finished nights", () => {
    const between = nightlyProgress({next_window_start: "2026-11-03T22:00:00+08:00", nights}, at("2026-11-03T12:00:00+08:00"));
    assert.deepEqual(between, {phase: "between", completed: 2, total: 4, currentWindowEnd: null, nextWindowStart: "2026-11-03T22:00:00+08:00"});
  });

  it("distinguishes an open window from one still unparking", () => {
    const active = nights.map((n, i) => (i === 2 ? {...n, state: "active"} : n));
    const open = nightlyProgress({next_window_start: "2026-11-03T22:00:00+08:00", nights: active}, at("2026-11-04T01:00:00+08:00"));
    assert.equal(open.phase, "in_window");
    assert.equal(open.currentWindowEnd, "2026-11-04T08:00:00+08:00");
    assert.equal(open.nextWindowStart, null);
    assert.equal(nightlyProgress({next_window_start: "2026-11-03T22:00:00+08:00", nights}, at("2026-11-03T22:05:00+08:00")).phase, "opening");
  });

  it("reports before-first and ended", () => {
    assert.equal(nightlyProgress({next_window_start: "2026-11-01T22:00:00+08:00", nights}, at("2026-11-01T12:00:00+08:00")).phase, "before_first");
    assert.equal(nightlyProgress({next_window_start: null, nights: nights.map((n) => ({...n, state: "ended"}))}, at("2026-11-06T12:00:00+08:00")).phase, "ended");
  });
});

describe("nightly order snapshot", () => {
  const order = {duration: 3, lease_end_at: "2026-11-04T08:00:00+08:00", night_start_date: "2026-11-01T00:00:00+08:00", night_start_min: 1320, night_end_min: 480};

  it("uses the order snapshot, falling back to the detail's product pricing mode", () => {
    assert.deepEqual(nightlyOrderSnapshot({...order, pricing_mode: "nightly"}), {
      nightly: true,
      snapshot: {nightStartDate: "2026-11-01", nights: 3, window: W},
    });
    assert.equal(nightlyOrderSnapshot(order, "nightly").nightly, true);
    assert.deepEqual(nightlyOrderSnapshot({...order, pricing_mode: "daily"}), {nightly: false, snapshot: null});
  });

  it("returns no snapshot when the night fields are missing", () => {
    assert.deepEqual(nightlyOrderSnapshot({duration: 3}, "nightly"), {nightly: true, snapshot: null});
  });
});
