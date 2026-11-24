import assert from "node:assert/strict";
import {test} from "node:test";

import {paymentReturnHtml, paymentReturnTarget} from "./payment-return.ts";

test("payment return lands on the buyer order detail for a valid order number", () => {
  assert.equal(paymentReturnTarget("ORD202611240644105ede9e"), "/console/buyer/orders/ORD202611240644105ede9e");
  assert.equal(paymentReturnTarget("REN20261124064410abcdef"), "/console/buyer/orders/REN20261124064410abcdef");
});

test("payment return never redirects off-site or injects markup", () => {
  for (const bad of ["", "https://evil.example", "//evil.example", "ORD\"><script>", "../admin", "ORD1"]) {
    assert.equal(paymentReturnTarget(bad), "/console/buyer/orders");
    assert.ok(!paymentReturnHtml(bad).includes("evil"));
    assert.ok(!paymentReturnHtml(bad).includes("<script"));
  }
});

test("payment return page navigates same-site without inline script", () => {
  const html = paymentReturnHtml("ORD202611240644105ede9e");
  assert.match(html, /http-equiv="refresh" content="0;url=\/console\/buyer\/orders\/ORD202611240644105ede9e"/);
  assert.ok(!html.includes("<script"));
});
