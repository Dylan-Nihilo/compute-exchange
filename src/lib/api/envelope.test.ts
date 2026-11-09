import assert from "node:assert/strict";
import {describe, it} from "node:test";
import {z} from "zod";

import {BackendRequestError, listPayload, requestEnvelope} from "./envelope.ts";

function respond(body: unknown, status = 200): typeof fetch {
  return async () =>
    new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status,
      headers: {"content-type": "application/json"},
    });
}

describe("requestEnvelope", () => {
  it("returns validated data on success", async () => {
    const data = await requestEnvelope("/api/x", z.object({id: z.number()}), {
      fallback: "失败",
      fetchImplementation: respond({code: 0, message: "ok", data: {id: 3}}),
    });
    assert.deepEqual(data, {id: 3});
  });

  it("keeps numeric backend codes and data for business errors", async () => {
    await assert.rejects(
      requestEnvelope("/api/x", z.unknown(), {
        fallback: "失败",
        fetchImplementation: respond(
          {code: 40001, message: "部署前检查未通过", data: {checks: [{id: "F1", ok: false}]}},
          400,
        ),
      }),
      (error: unknown) =>
        error instanceof BackendRequestError &&
        error.code === 40001 &&
        error.status === 400 &&
        error.message === "部署前检查未通过" &&
        JSON.stringify(error.data) === JSON.stringify({checks: [{id: "F1", ok: false}]}),
    );
  });

  it("flags endpoints that are not released yet", async () => {
    await assert.rejects(
      requestEnvelope("/api/x", z.unknown(), {
        fallback: "失败",
        fetchImplementation: respond({code: 50000, message: "该功能暂未开放"}, 501),
      }),
      (error: unknown) => error instanceof BackendRequestError && error.notOpen,
    );
  });

  it("rejects malformed payloads and transport failures without inventing data", async () => {
    await assert.rejects(
      requestEnvelope("/api/x", z.object({id: z.number()}), {
        fallback: "失败",
        fetchImplementation: respond({code: 0, message: "ok", data: {id: "3"}}),
      }),
      /服务返回格式错误/,
    );
    await assert.rejects(
      requestEnvelope("/api/x", z.unknown(), {
        fallback: "失败",
        unavailable: "节点服务暂不可用",
        fetchImplementation: async () => {
          throw new TypeError("network");
        },
      }),
      /节点服务暂不可用/,
    );
  });
});

describe("listPayload", () => {
  it("normalizes paged, bare and empty lists", () => {
    const schema = listPayload(z.object({id: z.number()}));
    assert.deepEqual(schema.parse([{id: 1}]), [{id: 1}]);
    assert.deepEqual(schema.parse({list: [{id: 2}], total: 1}), [{id: 2}]);
    assert.deepEqual(schema.parse({list: null}), []);
    assert.deepEqual(schema.parse(null), []);
  });
});
