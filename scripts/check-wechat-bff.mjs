// Run after pnpm build. The real Next.js BFF talks only to this local backend stub.
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {createServer, request as httpRequest} from "node:http";
import {once} from "node:events";
import {createWriteStream} from "node:fs";
import {setTimeout as delay} from "node:timers/promises";

const state = "a".repeat(64);
const ticket = "b".repeat(64);
let verifier;
let enabled = true;
let exchanges = 0;
let bindings = 0;
const backend = createServer(async (req, res) => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  let data;
  let code = 0;
  if (req.url === "/api/v1/auth/wechat/status") data = {enabled};
  else if (req.url === "/api/v1/auth/wechat/start") {
    verifier = body.browser_verifier;
    assert.match(verifier, /^[a-f0-9]{64}$/);
    if (!enabled) code = 40300;
    else data = {authorize_url: `https://open.weixin.qq.com/connect/qrconnect?state=${state}&scope=snsapi_login`};
  } else if (req.url === "/api/v1/auth/wechat/exchange") {
    exchanges++;
    assert.equal(body.browser_verifier, verifier);
    assert.equal(body.state, state);
    if (body.code === "linked") data = {access_token: "platform-access", refresh_token: "platform-refresh", expires_in: 900, user: {id: 42, phone: "188****1001", roles: ["buyer", "supplier"]}};
    else if (body.code === "unlinked") data = {binding_required: true, binding_ticket: ticket};
    else code = 40100;
  } else if (req.url === "/api/v1/auth/wechat/bind") {
    bindings++;
    assert.equal(req.headers.authorization, "Bearer platform-access");
    assert.deepEqual(body, {binding_ticket: ticket});
  } else { res.writeHead(404); res.end(); return; }
  res.writeHead(200, {"Content-Type": "application/json"});
  res.end(JSON.stringify({code, message: code ? "unavailable" : "success", data}));
});
backend.listen(0, "127.0.0.1");
await once(backend, "listening");
const origin = "http://localhost:3101";
const log = createWriteStream("/tmp/omnis-wechat-bff.log");
const app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3101"], {
  env: {...process.env, AUTH_API_BASE_URL: `http://127.0.0.1:${backend.address().port}/api/v1`},
  stdio: ["ignore", "pipe", "pipe"],
});
app.stdout.pipe(log);
app.stderr.pipe(log);
const cookieHeader = (response) => response.headers.getSetCookie().filter((c) => !c.includes("Max-Age=0")).map((c) => c.split(";")[0]).join("; ");
const post = (path, body, cookie = "", requestOrigin = origin) => fetch(origin + path, {method: "POST", redirect: "manual", headers: {origin: requestOrigin, cookie, "Content-Type": "application/json"}, body: JSON.stringify(body)});
// Node fetch ignores a custom Host header. Use http.request to simulate Caddy accurately.
const proxiedRequest = (path, body, cookie = "") => new Promise((resolve, reject) => {
  const request = httpRequest(origin + path, {method: body === undefined ? "GET" : "POST", headers: {host: "omnis.example", origin: "https://omnis.example", "x-forwarded-proto": "https", "content-type": "application/json", cookie}}, (response) => {
    let text = "";
    response.on("data", (chunk) => { text += chunk; });
    response.on("end", () => {
      const headers = new Headers();
      for (const [name, value] of Object.entries(response.headers)) {
        for (const item of Array.isArray(value) ? value : [value]) if (item !== undefined) headers.append(name, item);
      }
      resolve(new Response(text, {status: response.statusCode, headers}));
    });
  });
  request.on("error", reject);
  request.end(body);
});
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (app.exitCode !== null) throw new Error("Next server exited; inspect /tmp/omnis-wechat-bff.log");
    try { if ((await fetch(origin + "/api/auth/wechat")).ok) { ready = true; break; } } catch {}
    await delay(100);
  }
  assert.ok(ready, "Next server failed to start");
  const start = () => post("/api/auth/wechat", {next: "/console/supplier", remember: true});
  assert.equal((await post("/api/auth/wechat", {}, "", "https://evil.example")).status, 403);
  const proxied = await proxiedRequest("/api/auth/wechat", "{}");
  assert.equal(proxied.status, 200, "same-origin login must work behind the HTTPS reverse proxy");
  const proxiedCallback = await proxiedRequest(`/api/auth/wechat/callback?code=linked&state=${state}`, undefined, cookieHeader(proxied));
  assert.ok(proxiedCallback.headers.get("location").startsWith("https://omnis.example/auth/login?"), "callback must use the public HTTPS origin");
  let response = await fetch(`${origin}/api/auth/wechat/callback?code=linked&state=${state}`, {redirect: "manual"});
  assert.match(response.headers.get("location"), /wechat_error=expired/);
  assert.equal(exchanges, 1);
  response = await start();
  let cookies = cookieHeader(response);
  assert.match(response.headers.getSetCookie().join(";"), /HttpOnly/);
  assert.ok(!(await response.text()).includes(verifier));
  response = await fetch(`${origin}/api/auth/wechat/callback?code=linked&state=${state}`, {redirect: "manual", headers: {cookie: cookies}});
  assert.match(response.headers.get("location"), /next=%2Fconsole%2Fsupplier/);
  assert.ok(!response.headers.get("location").includes("platform-"));
  assert.match(response.headers.getSetCookie().join(";"), /omnis_access_token=platform-access/);
  const authCookies = cookieHeader(response);
  response = await start();
  cookies = cookieHeader(response);
  response = await fetch(`${origin}/api/auth/wechat/callback?code=unlinked&state=${state}`, {redirect: "manual", headers: {cookie: cookies}});
  assert.match(response.headers.get("location"), /\/auth\/wechat\/bind\?/);
  assert.ok(!response.headers.get("location").includes(ticket));
  cookies = cookieHeader(response);
  assert.match(cookies, /omnis_wechat_binding=/);
  response = await post("/api/auth/wechat/bind", {binding_ticket: "attacker-input"}, cookies + "; " + authCookies);
  assert.equal((await response.json()).code, 0);
  assert.equal(bindings, 1);
  assert.match(response.headers.getSetCookie().join(";"), /Max-Age=0/);
  assert.equal((await post("/api/auth/wechat/bind", {}, cookies, "https://evil.example")).status, 403);
  assert.equal(bindings, 1);
  enabled = false;
  assert.equal((await (await start()).json()).code, 40300);
  console.log("WeChat BFF passed: same-origin checks, cookie-only verifier/ticket/tokens, linked login, first binding, invalid callback and disabled provider.");
} finally {
  app.kill("SIGTERM");
  await once(app, "exit");
  backend.close();
  log.end();
}
