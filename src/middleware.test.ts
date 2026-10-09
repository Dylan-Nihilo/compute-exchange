import assert from "node:assert/strict";
import test from "node:test";

import {NextRequest} from "next/server.js";

import {middleware} from "./middleware.ts";

test("protected pages redirect signed-out users to login", () => {
  const response = middleware(
    new NextRequest("http://localhost:3000/console/buyer?tab=orders"),
  );

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("x-robots-tag"), "noindex");
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
  assert.equal(response.headers.get("x-robots-tag"), "noindex");
});

test("supplier onboarding stays protected outside the auth route group", () => {
  const response = middleware(
    new NextRequest("http://localhost:3000/supplier/apply"),
  );

  assert.equal(response.status, 307);
  assert.equal(
    response.headers.get("location"),
    "http://localhost:3000/auth/login?next=%2Fsupplier%2Fapply",
  );
});


test("legal documents stay publicly readable with a version link", () => {
  for (const path of ["terms", "privacy", "resource-listing-rules", "resource-usage-rules"]) {
    const response = middleware(new NextRequest(`http://localhost:3000/${path}?version=2026-09-06.1`));
    assert.equal(response.headers.get("x-middleware-next"), "1", path);
    assert.equal(response.headers.get("x-robots-tag"), null, path);
  }
});

test("the public home rewrites to landing without losing query parameters", () => {
  const response = middleware(
    new NextRequest("http://localhost:3000/?utm_source=search"),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
  assert.equal(
    response.headers.get("x-middleware-rewrite"),
    "http://localhost:3000/landing?utm_source=search",
  );
});

test("landing aliases permanently redirect to the home URL and preserve queries", () => {
  for (const path of ["/landing", "/landing/"]) {
    const response = middleware(
      new NextRequest(`http://localhost:3000${path}?utm_source=search`),
    );

    assert.equal(response.status, 308, path);
    assert.equal(
      response.headers.get("location"),
      "http://localhost:3000/?utm_source=search",
      path,
    );
  }
});

test("crawler metadata endpoints bypass the fallback redirect", () => {
  for (const path of ["/robots.txt", "/sitemap.xml"]) {
    const response = middleware(new NextRequest(`http://localhost:3000${path}`));

    assert.equal(response.headers.get("x-middleware-next"), "1", path);
    assert.equal(response.headers.get("location"), null, path);
    assert.equal(response.headers.get("x-robots-tag"), null, path);
  }
});

test("account entry pages remain accessible with noindex", () => {
  for (const path of ["/auth/login", "/auth/register", "/unauthorized"]) {
    const response = middleware(new NextRequest(`http://localhost:3000${path}`));

    assert.equal(response.headers.get("x-middleware-next"), "1", path);
    assert.equal(response.headers.get("x-robots-tag"), "noindex", path);
  }
});
