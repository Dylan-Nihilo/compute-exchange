// Run against a production build; reuse an installed Playwright via PLAYWRIGHT_MODULE.
import assert from "node:assert/strict";
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({channel: "chrome", headless: true});
const base = process.argv[2] || "http://127.0.0.1:3101";
const media = "**/compute-spot/hero-motion-4k-*.mp4";
const contexts = [];
async function scenario(options = {}, prepare = async () => {}) {
  const context = await browser.newContext({viewport: {width: 1440, height: 900}, ...options});
  contexts.push(context);
  await context.addInitScript(() => {
    window.__heroUrls = {created: 0, revoked: 0};
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (...args) => { window.__heroUrls.created++; return create(...args); };
    URL.revokeObjectURL = (...args) => { window.__heroUrls.revoked++; return revoke(...args); };
  });
  const requests = [], errors = [];
  context.on("request", (request) => requests.push(request.url()));
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await prepare(context, page);
  await page.goto(base, {waitUntil: "domcontentloaded"});
  return {context, page, requests, errors};
}
async function ready(page) {
  await page.waitForFunction(() => {
    const v = document.querySelector("#hero video");
    return v && !v.paused && Number(getComputedStyle(v).opacity) === 1;
  });
}
try {
  const plain = await scenario({}, async (context) => {
    await context.route("**/_next/static/**/*.js", (route) => route.abort());
  });
  for (const route of ["/", "/landing"]) {
    if (route !== "/") await plain.page.goto(base + route, {waitUntil: "domcontentloaded"});
    await plain.page.waitForFunction(() => {
      let el = document.querySelector('[data-hero="content"] h1 span');
      if (!el || document.querySelector(".hero-spectrum-loader")) return false;
      while (el) {
        const style = getComputedStyle(el);
        if (style.opacity === "0" || style.display === "none" || style.visibility === "hidden") return false;
        el = el.parentElement;
      }
      return true;
    });
    await plain.page.waitForFunction(() => document.querySelector("#hero img")?.complete);
  }
  await plain.page.locator('[data-hero="content"]').getByRole("link", {name: "进入算力市场", exact: true}).click();
  await plain.page.waitForURL("**/market");
  await plain.context.close();

  for (const viewport of [{width: 1440, height: 900}, {width: 390, height: 844}]) {
    const s = await scenario({viewport});
    await ready(s.page);
    const state = await s.page.locator("#hero video").evaluate((v) => ({src: v.currentSrc, width: v.videoWidth, height: v.videoHeight, duration: v.duration, buffer: v.buffered.end(0)}));
    assert(state.src.startsWith("blob:") && state.width === 3840 && state.height === 2160 && state.buffer >= state.duration - 0.05);
    await s.page.setViewportSize({width: viewport.width + 50, height: viewport.height});
    assert.equal(s.requests.filter((url) => url.endsWith(".mp4") && url.includes("hero-motion")).length, 1);
    assert(!s.requests.some((url) => url.includes("/fonts/AlibabaPuHuiTi")));
    await s.page.locator('[data-hero="content"]').getByRole("link", {name: "进入算力市场", exact: true}).click();
    await s.page.waitForURL("**/market");
    await s.page.waitForFunction(() => window.__heroUrls.created === 1 && window.__heroUrls.revoked === 1);
    await s.page.goBack();
    await ready(s.page);
    assert.equal(s.requests.filter((url) => url.endsWith(".mp4") && url.includes("hero-motion")).length, 2);
    await s.page.emulateMedia({reducedMotion: "reduce"});
    await s.page.waitForFunction(() => !document.querySelector("#hero video"));
    await s.page.waitForFunction(() => window.__heroUrls.created === 2 && window.__heroUrls.revoked === 2);
    assert.deepEqual(s.errors, []);
    await s.context.close();
  }

  for (const mode of ["reduced", "save-data", "404", "play-rejected", "poster-failed", "poster-timeout", "font-failed", "no-frame-api"]) {
    const s = await scenario(mode === "reduced" ? {reducedMotion: "reduce"} : {}, async (context) => {
      if (mode === "save-data") await context.addInitScript(() => Object.defineProperty(navigator, "connection", {value: {saveData: true}}));
      if (mode === "404") await context.route(media, (route) => route.fulfill({status: 404, body: ""}));
      if (mode === "play-rejected") await context.addInitScript(() => { HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException("Blocked", "NotAllowedError")); });
      if (mode === "poster-failed") await context.route("**/_next/image?*hero-motion-poster*", (route) => route.fulfill({status: 404, body: ""}));
      if (mode === "poster-timeout") await context.route("**/_next/image?*hero-motion-poster*", () => {});
      if (mode === "font-failed") await context.route("**/fonts/*.woff2", (route) => route.abort());
      if (mode === "no-frame-api") await context.addInitScript(() => { HTMLVideoElement.prototype.requestVideoFrameCallback = undefined; });
    });
    if (["poster-failed", "poster-timeout", "font-failed", "no-frame-api"].includes(mode)) await ready(s.page);
    else {
      await s.page.waitForTimeout(1200);
      assert(await s.page.evaluate(() => { const v = document.querySelector("#hero video"); return !v || (!v.getAttribute("src") && getComputedStyle(v).opacity === "0"); }));
      if (["reduced", "save-data"].includes(mode)) assert(!s.requests.some((url) => url.endsWith(".mp4")));
      if (mode === "play-rejected") assert.deepEqual(await s.page.evaluate(() => window.__heroUrls), {created: 1, revoked: 1});
    }
    await s.page.getByRole("searchbox").fill("H100");
    await s.page.getByRole("button", {name: "搜索算力", exact: true}).click();
    await s.page.waitForURL("**/market?q=H100", {waitUntil: "domcontentloaded"});
    await s.page.locator("#hero").waitFor({state: "detached"});
    assert.deepEqual(s.errors, []);
    await s.context.close();
    console.log(`${mode}: fallback and search passed`);
  }

  for (const mode of ["timeout", "leave-before-download"]) {
    let aborted = false, release, cancelled;
    const s = await scenario({}, async (context, page) => {
      await context.route(media, (route) => { release = () => route.abort().catch(() => {}); });
      page.on("requestfailed", (request) => { if (request.url().endsWith(".mp4")) aborted = true; });
      cancelled = page.waitForEvent("requestfailed", {predicate: (request) => request.url().endsWith(".mp4"), timeout: 25_000});
    });
    await s.page.waitForFunction(() => !!document.querySelector("#hero video"));
    // Let the request start before testing the actual 20-second deadline or navigation cleanup.
    await s.page.waitForTimeout(500);
    if (mode === "timeout") await s.page.waitForTimeout(20_500);
    else { await s.page.locator('[data-hero="content"]').getByRole("link", {name: "进入算力市场", exact: true}).click(); await s.page.waitForURL("**/market"); }
    await cancelled;
    assert(aborted, `${mode}: pending download was not aborted`);
    assert.deepEqual(await s.page.evaluate(() => window.__heroUrls), {created: 0, revoked: 0});
    await release?.();
    await s.context.close();
    console.log(`${mode}: cleanup passed`);
  }
  console.log("Landing first paint, original 4K playback, navigation and media cleanup passed");
} finally {
  await Promise.all(contexts.map((context) => context.close().catch(() => {})));
  await browser.close();
}
