import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {formatDate, formatDateTime, toIsoTimestamp} from "./date.ts";

describe("date formatting", () => {
  it("uses the product locale and Asia/Shanghai time zone by default", () => {
    const timestamp = "2026-07-14T00:30:00.000Z";

    assert.equal(formatDate(timestamp), "2026年7月14日");
    assert.equal(formatDateTime(timestamp), "2026年7月14日 08:30");
  });

  it("normalizes accepted date inputs to an ISO timestamp", () => {
    assert.equal(
      toIsoTimestamp("2026-07-14T08:30:00+08:00"),
      "2026-07-14T00:30:00.000Z",
    );
  });

  it("rejects invalid date values", () => {
    assert.throws(() => formatDate("not-a-date"), /valid ISO timestamp/);
    assert.throws(() => formatDate("07\/14\/2026"), /valid ISO timestamp/);
    assert.throws(() => toIsoTimestamp(Number.NaN), /valid date/);
  });
});
