import assert from "node:assert/strict";
import {it} from "node:test";

import {capabilities} from "./permissions.ts";
import {canAccessRoute} from "./routes.ts";

const operationalRoutes = ["/admin/reviews", "/admin/products", "/admin/orders", "/admin/finance", "/admin/crm", "/admin/risk", "/admin/tickets", "/admin/tokens", "/admin/cms", "/admin/users", "/admin/audit"];

it("allows real operator role sessions with empty grants into existing operational pages", () => {
  for (const path of operationalRoutes) {
    assert.equal(canAccessRoute(path, {role: "operator", verificationStatus: "unverified", grants: []}), true, path);
  }
});

it("keeps other roles and administrator-only pages isolated even with forged grants", () => {
  for (const role of ["guest", "buyer", "supplier", "vendor", "funder"] as const) {
    for (const path of operationalRoutes) assert.equal(canAccessRoute(path, {role, verificationStatus: "verified", grants: capabilities}), false, `${role}:${path}`);
  }
  for (const path of ["/admin/access", "/admin/settings"]) {
    assert.equal(canAccessRoute(path, {role: "operator", verificationStatus: "verified", grants: capabilities}), false);
    assert.equal(canAccessRoute(path, {role: "admin", verificationStatus: "unverified", grants: []}), true);
  }
});
