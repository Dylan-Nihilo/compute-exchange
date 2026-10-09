import assert from "node:assert/strict";
import test from "node:test";

import robots from "./robots.ts";
import sitemap from "./sitemap.ts";

test("the sitemap contains only canonical public pages without query variants", () => {
  assert.deepEqual(sitemap().map(({url}) => url), [
    "https://omnisline.com/",
    "https://omnisline.com/terms",
    "https://omnisline.com/privacy",
    "https://omnisline.com/resource-listing-rules",
    "https://omnisline.com/resource-usage-rules",
  ]);
});

test("crawler rules allow public content and assets while excluding private routes", () => {
  const {rules, sitemap: sitemapUrl} = robots();

  assert.ok(!Array.isArray(rules));
  assert.equal(rules.userAgent, "*");
  assert.equal(rules.allow, "/");
  assert.ok(Array.isArray(rules.disallow));
  assert.ok(rules.disallow.includes("/api/"));
  assert.ok(rules.disallow.includes("/auth"));
  assert.ok(rules.disallow.includes("/market"));
  for (const path of ["/_next/static/app.js", "/images/hero.webp", "/privacy"]) {
    assert.ok(!rules.disallow.some((route) => path.startsWith(route)), path);
  }
  assert.equal(sitemapUrl, "https://omnisline.com/sitemap.xml");
});
