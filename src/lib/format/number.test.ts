import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {
  formatMoney,
  formatNumber,
  formatPercentage,
  moneyToMajorUnits,
} from "./number.ts";

describe("number formatting", () => {
  it("formats product numbers with the shared Chinese locale", () => {
    assert.equal(formatNumber(1_234.5), "1,234.5");
    assert.equal(formatPercentage(0.1234, {maximumFractionDigits: 1}), "12.3%");
  });

  it("keeps CNY arithmetic in integer minor units until display", () => {
    const money = {amountMinor: 123_456, currency: "CNY"} as const;

    assert.equal(moneyToMajorUnits(money), 1_234.56);
    assert.equal(formatMoney(money), "¥1,234.56");
  });

  it("rejects non-finite display values", () => {
    assert.throws(() => formatNumber(Number.NaN), /finite number/);
    assert.throws(() => formatPercentage(Number.POSITIVE_INFINITY), /finite number/);
  });
});
