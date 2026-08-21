import assert from "node:assert/strict";
import test from "node:test";

import {NextRequest} from "next/server.js";

import {middleware} from "./middleware.ts";

test("protected pages redirect signed-out users to login", () => {
  const response = middleware(
    new NextRequest("http://localhost:3000/console/buyer?tab=orders"),
  );

  assert.equal(response.status, 307);
  assert.equal(
    response.headers.get("location"),
    "http://localhost:3000/auth/login?next=%2Fconsole%2Fbuyer%3Ftab%3Dorders",
  );
});

test("protected pages allow refresh-cookie sessions to reach the account check", () => {
  const response = middleware(
    new NextRequest("http://localhost:3000/console/buyer", {
      headers: {cookie: "omnis_refresh_token=refresh-token"},
    }),
  );

  assert.equal(response.headers.get("x-middleware-next"), "1");
});
