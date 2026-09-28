import assert from "node:assert/strict";
import {it} from "node:test";

import {streamCompute} from "./agent-search-stream.ts";

const encoder = new TextEncoder();
const result = {relevant: true, summary: "需要94GB显存🖥", machine_plans: [], analysis_steps: [], compute_estimate: {total_vram_gb: 94, per_card_vram_gb: 80, min_cards: 2, compute_class: "推理", basis: "72×1×1.3≈94"}, requirement: {purpose: "推理", gpu_models: [], card_count: 2, pricing_mode: "monthly", duration_hint: 1, budget_fen_max: 10000000, region: ""}, matches: []};
const event = (name: string, data: unknown) => `event: ${name}\r\ndata: ${JSON.stringify(data)}\r\n\r\n`;

it("delivers UTF-8 summary chunks before the final result and sends one uncached request", async () => {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({start(value) {controller = value;}});
  const received: string[] = [];
  let notify!: () => void;
  const first = new Promise<void>((resolve) => {notify = resolve;});
  let finished = false;
  const pending = streamCompute(" 72B推理 ", (text) => {received.push(text); notify();}, async (url, init) => {
    assert.equal(url, "/api/market/agent-search/stream");
    assert.equal(init?.cache, "no-store");
    assert.equal(init?.credentials, "include");
    assert.deepEqual(JSON.parse(String(init?.body)), {query: "72B推理"});
    return new Response(body, {headers: {"content-type": "text/event-stream"}});
  }).then((value) => {finished = true; return value;});
  // Split every byte, including Chinese codepoints, surrogate-pair glyphs and CRLF.
  for (const byte of encoder.encode(event("summary", {text: "需要94GB显存🖥"}))) controller.enqueue(new Uint8Array([byte]));
  await first;
  assert.deepEqual(received, [result.summary]);
  assert.equal(finished, false);
  controller.enqueue(encoder.encode(event("result", {code: 0, data: result})));
  assert.deepEqual(await pending, result);
});

it("fails closed on truncated, malformed and failed streams without exposing gateway details", async () => {
  for (const wire of [
    event("summary", {text: "需要94GB"}),
    'event: result\ndata: invalid\n\n',
    event("result", {code: 0, data: {...result, compute_estimate: null}}),
  ]) {
    await assert.rejects(streamCompute("H100", () => {}, async () => new Response(wire, {headers: {"content-type": "text/event-stream"}})), /连接中断/);
  }
  await assert.rejects(streamCompute("H100", () => {}, async () => new Response(event("error", {code: 50000, message: "PRIVATE_GATEWAY_DETAIL"}), {headers: {"content-type": "text/event-stream"}})), /暂不可用/);
  await assert.rejects(streamCompute("H100", () => {}, async () => Response.json({code: 42900, message: "internal"})), /请求较频繁/);
  await assert.rejects(streamCompute("H100", () => {}, async () => Response.json({code: 40100}, {status: 401})), /重新登录/);
});

it("keeps refusal separate and propagates cancellation to the transport", async () => {
  const refusal = {relevant: false, reject_reason: "请描述算力需求"};
  assert.deepEqual(await streamCompute("写诗", () => assert.fail("refusal must not stream analysis"), async () => new Response(event("result", {code: 0, data: refusal}), {headers: {"content-type": "text/event-stream"}})), refusal);
  const abort = new AbortController();
  const pending = streamCompute("H100", () => {}, async (_url, init) => {
    return new Response(new ReadableStream({start(controller) {init?.signal?.addEventListener("abort", () => controller.error(init.signal?.reason), {once: true});}}), {headers: {"content-type": "text/event-stream"}});
  }, abort.signal);
  abort.abort();
  await assert.rejects(pending, /停止或超时/);
});
