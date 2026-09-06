import assert from "node:assert/strict";
import test from "node:test";
import {weChatAuthorizationUrl, readWeChatContext, sameOriginRequest} from "./wechat.ts";

test("WeChat authorization rejects foreign redirects and malformed browser context", () => {
 const state = "a".repeat(64);
 const url = `https://open.weixin.qq.com/connect/qrconnect?state=${state}&scope=snsapi_login`;
 assert.equal(weChatAuthorizationUrl(url), url);
 for (const value of ["javascript:alert(1)", "https://open.weixin.qq.com.evil.test/connect/qrconnect", "http://open.weixin.qq.com/connect/qrconnect", "https://user:pass@open.weixin.qq.com/connect/qrconnect", "https://open.weixin.qq.com/connect/qrconnect?scope=other"]) assert.throws(() => weChatAuthorizationUrl(value));
 assert.equal(readWeChatContext('{'), null);
 assert.equal(readWeChatContext(JSON.stringify({verifier: "short"})), null);
 assert.deepEqual(readWeChatContext(JSON.stringify({verifier: state, next: "//evil.test", remember: true})), {verifier: state, next: null, remember: true});
 assert.equal(sameOriginRequest(new Request("https://omnis.example/api/auth/wechat", {headers: {origin: "https://evil.example"}})), false);
 assert.equal(sameOriginRequest(new Request("https://omnis.example/api/auth/wechat", {headers: {origin: "https://omnis.example"}})), true);
});
