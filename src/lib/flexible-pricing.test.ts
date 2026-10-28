import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {BackendRequestError} from "./api/envelope.ts";
import {
  enabledRentalPrices,
  fetchProductAvailability,
  formatNightWindow,
  leaseStartRuleText,
  nightWindowMinutes,
  parseCardSplitOptions,
  resolveCheckoutAmounts,
  serializeCardSplitOptions,
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
  it("accepts the API array (and legacy string), drops unknown values and sorts", () => {
    assert.deepEqual(parseCardSplitOptions([4, 1, 4, 16]), [1, 4]);
    assert.deepEqual(parseCardSplitOptions("8, 2,1,3"), [1, 2, 8]);
    assert.deepEqual(parseCardSplitOptions(null), []);
  });

  it("serializes as the []int the create/resubmit request binds", () => {
    assert.deepEqual(serializeCardSplitOptions([8, 1, 2]), [1, 2, 8]);
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

describe("availability quote", () => {
  const managed = {
    available: true,
    reason: "",
    quote: {pricing_mode: "hourly", unit_price: 1500, quantity: 4, duration: 2, total_amount: 12000, platform_fee: 780, fee_rate: 650},
    lease_preview: {start_rule: "on_activation", start_at: "2026-10-28T15:04:05+08:00", end_at: "2026-10-28T17:04:05+08:00"},
  };

  it("queries with pricing_mode/cards/duration and parses the exact backend shape", async () => {
    let url = "";
    const result = await fetchProductAvailability("12", {pricingMode: "hourly", cards: 4, duration: 2}, async (input) => {
      url = String(input);
      return Response.json({code: 0, message: "success", data: managed});
    });
    assert.equal(url, "/api/market-proxy/products/12/availability?pricing_mode=hourly&cards=4&duration=2");
    assert.equal(result.quote?.total_amount, 12000);
    assert.equal(result.lease_preview?.start_rule, "on_activation");
  });

  it("omits pricing_mode for legacy single-price products and keeps the quote when unavailable", async () => {
    let url = "";
    const result = await fetchProductAvailability("12", {cards: 7, duration: 1}, async (input) => {
      url = String(input);
      return Response.json({code: 0, message: "success", data: {
        available: false, reason: "库存不足: 当前可租 6",
        quote: {pricing_mode: "hourly", unit_price: 2300, quantity: 7, duration: 1, total_amount: 16100, platform_fee: 1046, fee_rate: 650},
        lease_preview: {start_rule: "on_buyer_confirm", start_at: null, end_at: null},
      }});
    });
    assert.equal(url, "/api/market-proxy/products/12/availability?cards=7&duration=1");
    assert.equal(result.available, false);
    assert.equal(result.quote?.total_amount, 16100);
    assert.equal(result.lease_preview?.start_at, null);
  });

  it("accepts the nightly not-open answer with null quote and preview", async () => {
    const result = await fetchProductAvailability("12", {pricingMode: "nightly", cards: 1, duration: 1}, async () =>
      Response.json({code: 0, message: "success", data: {available: false, reason: "包夜预订尚未开放(夜间日历与每晚开停机待接入), 暂不可下单", quote: null, lease_preview: null}}));
    assert.equal(result.quote, null);
    assert.match(result.reason, /包夜预订尚未开放/);
  });

  it("rejects an unknown start_rule instead of guessing", async () => {
    await assert.rejects(
      fetchProductAvailability("12", {cards: 1, duration: 1}, async () =>
        Response.json({code: 0, data: {...managed, lease_preview: {start_rule: "immediately", start_at: null, end_at: null}}})),
      (error) => error instanceof BackendRequestError && error.message === "服务返回格式错误",
    );
  });

  it("surfaces 42900 rate limiting and 40001 parameter errors with the backend message", async () => {
    await assert.rejects(
      fetchProductAvailability("12", {pricingMode: "hourly", cards: 1, duration: 1}, async () =>
        Response.json({code: 42900, message: "查询过于频繁, 每分钟最多 30 次, 请稍后再试"})),
      (error) => error instanceof BackendRequestError && error.code === 42900 && /每分钟最多 30 次/.test(error.message),
    );
    await assert.rejects(
      fetchProductAvailability("12", {pricingMode: "hourly", cards: 3, duration: 1}, async () =>
        Response.json({code: 40001, message: "所选卡数 3 不在该商品可选卡数 1,2,4,8 内"})),
      (error) => error instanceof BackendRequestError && error.code === 40001,
    );
  });

  it("rejects invalid product ids before any request and labels start rules", () => {
    assert.throws(() => fetchProductAvailability("abc", {cards: 1, duration: 1}), /商品编号无效/);
    assert.match(leaseStartRuleText("on_activation"), /自检通过/);
    assert.match(leaseStartRuleText("on_buyer_confirm"), /确认签收/);
  });
});

describe("checkout amounts", () => {
  const estimate = {totalMinor: 100, feeMinor: 6, feeRate: 650};
  const quote = {pricing_mode: "hourly", unit_price: 50, quantity: 2, duration: 1, total_amount: 120, platform_fee: 7, fee_rate: 600};

  it("prefers the backend quote, also when the selection is unavailable", () => {
    assert.deepEqual(resolveCheckoutAmounts({available: false, reason: "所选卡数暂无整机余量", quote, lease_preview: null}, estimate),
      {source: "quote", totalMinor: 120, feeMinor: 7, feeRate: 600});
  });

  it("shows no amount when the backend answered without a quote (nightly not open)", () => {
    assert.deepEqual(resolveCheckoutAmounts({available: false, reason: "包夜预订尚未开放", quote: null, lease_preview: null}, estimate), {source: "none"});
  });

  it("falls back to a labelled local estimate only when there is no backend answer", () => {
    assert.deepEqual(resolveCheckoutAmounts(undefined, estimate), {source: "estimate", ...estimate});
    assert.deepEqual(resolveCheckoutAmounts(undefined, null), {source: "none"});
  });
});
