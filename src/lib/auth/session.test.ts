import assert from "node:assert/strict";
import {describe, it} from "node:test";

import type {SessionAccount} from "./contracts.ts";
import {completedVerificationDestination} from "./session.ts";

const buyer: SessionAccount = {
  id: "12",
  displayName: "18800001003",
  email: "",
  phoneNumber: "18800001003",
  roles: ["buyer"],
  verificationStatus: "verified",
  grants: [],
};

describe("verification route", () => {
  it("sends a verified account away from the verification form", () => {
    assert.equal(
      completedVerificationDestination(buyer, null, null),
      "/console/buyer",
    );
    assert.equal(
      completedVerificationDestination(
        {...buyer, verificationStatus: "unverified"},
        null,
        null,
      ),
      null,
    );
  });
});
