import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {BackendRequestError} from "./api/envelope.ts";
import {
  addDays,
  enabledRentalPrices,
  fetchNightCalendar,
  fetchProductAvailability,
  formatNightWindow,
  nightWindowMinutes,
  parseCardSplitOptions,
  serializeCardSplitOptions,
  shanghaiDate,
  validateNightWindow,
} from "./flexible-pricing.ts";

describe("night window", () => {
  it("formats cross-midnight and same-day windows", () => {
    assert.equal(formatNightWindow(1320, 480), "22:00–次日 08:00（北京时间）");
    assert.equal(formatNightWindow(60, 360), "01:00–06:00（北京时间）");
    assert.equal(nightWindowMinutes(1320, 480), 600);
  });

  it("enforces alignment and 4–14 hour length", () => {
    assert.equal(validateNightWindow(1320, 480), null);
    assert.equal(validateNightWindow(1320, 495), "夜间窗口需按 30 分钟对齐");
    assert.equal(validateNightWindow(1320, 1440), "夜间窗口时间无效");
    assert.equal(validateNightWindow(1320, 60), "夜间窗口时长需在 4 到 14 小时之间");
    assert.equal(validateNightWindow(600, 600), "夜间窗口时长需在 4 到 14 小时之间");
  });
});

describe("card split options", () => {
  it("accepts string and array forms, drops unknown values and sorts", () => {
    assert.deepEqual(parseCardSplitOptions("8, 2,1,3"), [1, 2, 8]);
    assert.deepEqual(parseCardSplitOptions([4, 1, 4, 16]), [1, 4]);
    assert.deepEqual(parseCardSplitOptions(null), []);
    assert.equal(serializeCardSplitOptions([8, 1, 2]), "1,2,8");
  });
});

describe("rental prices", () => {
  it("keeps enabled known modes in period order", () => {
    assert.deepEqual(
      enabledRentalPrices([
        {pricing_mode: "monthly", unit_price: 900000},
        {pricing_mode: "hourly", unit_price: 1860, min_duration: 4},
        {pricing_mode: "daily", unit_price: 40000, enabled: false},
        {pricing_mode: "perpetual", unit_price: 1},
      ]),
      [
        {pricingMode: "hourly", unitPriceMinor: 1860, minDuration: 4},
        {pricingMode: "monthly", unitPriceMinor: 900000, minDuration: 1},
      ],
    );
  });
});

describe("availability and night calendar", () => {
  it("queries availability with the selected options", async () => {
    let url = "";
    const result = await fetchProductAvailability(
      "7",
      {pricingMode: "nightly", cards: 2, duration: 3, nightStartDate: "2026-10-28"},
      async (input) => {
        url = String(input);
        return Response.json({
          code: 0,
          message: "ok",
          data: {
            available: true,
            reason: null,
            quote: {unit_price: 5000, total_amount: 30000, platform_fee: 1500, fee_rate: 500},
            lease_preview: {start_at: "2026-10-28T14:00:00Z", end_at: "2026-10-31T00:00:00Z"},
          },
        });
      },
    );
    assert.equal(
      url,
      "/api/market-proxy/products/7/availability?pricing_mode=nightly&cards=2&duration=3&night_start_date=2026-10-28",
    );
    assert.equal(result.quote?.total_amount, 30000);
  });

  it("surfaces rate limiting and not-open responses as errors", async () => {
    await assert.rejects(
      fetchProductAvailability("7", {pricingMode: "hourly", cards: 1, duration: 1}, async () =>
        Response.json({code: 42900, message: "请求过于频繁"}, {status: 429})),
      (error) => error instanceof BackendRequestError && error.code === 42900 && error.message === "请求过于频繁",
    );
    await assert.rejects(
      fetchNightCalendar("7", {cards: 1, from: "2026-10-28"}, async () =>
        Response.json({code: 50000, message: "该功能暂未开放"}, {status: 501})),
      (error) => error instanceof BackendRequestError && error.notOpen,
    );
  });

  it("caps the calendar horizon at 30 days and maps null to empty", async () => {
    let url = "";
    const days = await fetchNightCalendar("7", {cards: 2, from: "2026-10-28", days: 90}, async (input) => {
      url = String(input);
      return Response.json({code: 0, message: "ok", data: null});
    });
    assert.match(url, /days=30/);
    assert.deepEqual(days, []);
  });

  it("rejects invalid product ids before any request", () => {
    assert.throws(() => fetchNightCalendar("abc", {cards: 1, from: "2026-10-28"}), /商品编号无效/);
  });
});

describe("dates", () => {
  it("uses Asia/Shanghai for today and adds calendar days", () => {
    assert.equal(shanghaiDate(new Date("2026-10-28T17:30:00Z")), "2026-10-29");
    assert.equal(addDays("2026-10-28", 4), "2026-11-01");
  });
});
