import assert from "node:assert/strict";
import test from "node:test";

import {isBuyerOrderActionAllowed} from "./buyer-order-proxy-rules.ts";

test("buyer order proxy allows the nightly per-night record and keeps the rest closed", () => {
  assert.equal(isBuyerOrderActionAllowed("GET", "nights"), true);
  assert.equal(isBuyerOrderActionAllowed("get", "outages"), true);
  assert.equal(isBuyerOrderActionAllowed("PUT", "outage-remedy"), true);
  assert.equal(isBuyerOrderActionAllowed("POST", "nights"), false);
  assert.equal(isBuyerOrderActionAllowed("GET", "nights/1"), false);
  assert.equal(isBuyerOrderActionAllowed("GET", "../admin"), false);
  assert.equal(isBuyerOrderActionAllowed("POST", "deployments/dep-1234/restart"), true);
});
