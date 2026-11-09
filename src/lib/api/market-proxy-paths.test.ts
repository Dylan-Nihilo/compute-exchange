import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {isMarketProxyPath} from "./market-proxy-paths.ts";

describe("market proxy allow-list", () => {
  it("allows market reads including the nightly calendar", () => {
    for (const path of ["products", "products/12", "products/12/availability", "products/12/night-calendar", "trading-config", "gpu-catalog", "models"]) {
      assert.equal(isMarketProxyPath(path), true, path);
    }
  });

  it("rejects anything else", () => {
    for (const path of ["products/abc/night-calendar", "products/12/night-calendar/x", "products/12/orders", "orders", "products/12/../admin", "admin/products"]) {
      assert.equal(isMarketProxyPath(path), false, path);
    }
  });
});
