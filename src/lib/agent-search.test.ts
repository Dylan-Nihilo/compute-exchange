import assert from "node:assert/strict";
import {it} from "node:test";

import {agentSearchQuerySchema, searchCompute} from "./agent-search.ts";
import {canAccessRoute, matchRoute} from "./domain/routes.ts";

it("counts500Unicode codepoints, trims input, and sends a single uncached authenticated request", async () => {
  assert.equal(agentSearchQuerySchema.parse(` ${"🖥".repeat(500)} `).length, 1000);
  assert.equal(agentSearchQuerySchema.safeParse("🖥".repeat(501)).success, false);
  assert.equal(agentSearchQuerySchema.safeParse("   ").success, false);
  const result = await searchCompute("  8卡H100  ", async (url, init) => {
    assert.equal(url, "/api/market/agent-search"); assert.equal(init?.method, "POST"); assert.equal(init?.cache, "no-store");
    assert.deepEqual(JSON.parse(String(init?.body)), {query: "8卡H100"});
    return Response.json({code: 0, data: {relevant: false, reject_reason: "请补充任务", matches: [], analysis_steps: null, requirement: null}});
  });
  assert.deepEqual(result, {relevant: false, reject_reason: "请补充任务"});
});

it("preserves server-derived conditions and rejects incomplete, business, network and timeout outcomes", async () => {
  const data = {relevant: true, analysis_steps: null, compute_estimate: {total_vram_gb: 94.4, per_card_vram_gb: 80, min_cards: 2, compute_class: "推理", basis: "72×1×1.3≈94"}, requirement: {purpose: "推理", gpu_models: null, card_count: 2, pricing_mode: "monthly", duration_hint: 1, budget_fen_max: 10000000, region: "北京"}, matches: null, note: "暂无匹配"};
  const result = await searchCompute("72B推理", async () => Response.json({code: 0, data}));
  assert.equal(result.relevant, true);
  if (result.relevant) {assert.equal(result.compute_estimate.total_vram_gb, 94.4); assert.deepEqual(result.matches, []); assert.deepEqual(result.requirement.gpu_models, []);}
  await assert.rejects(searchCompute("H100", async () => Response.json({code: 0, data: {...data, compute_estimate: null}})), /结果不完整/);
  await assert.rejects(searchCompute("H100", async () => Response.json({code: 50000, message: "ai.api_key 未配置"})), /暂不可用/);
  await assert.rejects(searchCompute("H100", async () => Response.json({code: 42900})), /请求较频繁/);
  await assert.rejects(searchCompute("H100", async () => Response.json({code: 40100}, {status: 401})), /重新登录/);
  await assert.rejects(searchCompute("H100", async () => {throw new DOMException("fixture timeout", "TimeoutError");}), /超时/);
  await assert.rejects(searchCompute("H100", async () => {throw new Error("upstream details");}), /暂不可用/);
});

it("makes the explicit intelligent-search route authenticated without buyer-only or synthetic grant restrictions", () => {
  assert.equal(matchRoute("/market/agent-search")?.href, "/market/agent-search");
  for (const role of ["guest", "buyer", "supplier", "vendor", "funder", "operator", "admin"] as const) {
    assert.equal(canAccessRoute("/market/agent-search", {role, verificationStatus: "unverified", grants: []}), role !== "guest");
  }
});
