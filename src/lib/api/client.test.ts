import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {z} from "zod";

import {ApiError, createApiClient} from "./client.ts";
import {createApiClientForEnvironment} from "./configured-client.ts";

describe("API client", () => {
  it("validates successful JSON responses and supplies safe transport defaults", async () => {
    let capturedInput: RequestInfo | URL | undefined;
    let capturedInit: RequestInit | undefined;
    const fetchImplementation: typeof fetch = async (input, init) => {
      capturedInput = input;
      capturedInit = init;
      return Response.json({id: "product-1"});
    };
    const client = createApiClient({
      baseUrl: "https://api.example.com/",
      fetchImplementation,
    });

    const product = await client.request(
      "/products?limit=1",
      z.object({id: z.string()}),
    );

    assert.deepEqual(product, {id: "product-1"});
    assert.equal(capturedInput, "https://api.example.com/products?limit=1");
    assert.equal(capturedInit?.credentials, "include");
    assert.equal(new Headers(capturedInit?.headers).get("accept"), "application/json");
  });

  it("serializes JSON request bodies without discarding caller headers", async () => {
    let capturedInit: RequestInit | undefined;
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      fetchImplementation: async (_input, init) => {
        capturedInit = init;
        return Response.json({accepted: true});
      },
    });

    await client.request("/orders", z.object({accepted: z.boolean()}), {
      headers: {"x-request-id": "request-1"},
      json: {productId: "product-1"},
      method: "POST",
    });

    const headers = new Headers(capturedInit?.headers);
    assert.equal(capturedInit?.method, "POST");
    assert.equal(capturedInit?.body, '{"productId":"product-1"}');
    assert.equal(headers.get("content-type"), "application/json");
    assert.equal(headers.get("x-request-id"), "request-1");
  });

  it("exposes structured API failures to feature services", async () => {
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      fetchImplementation: async () =>
        Response.json(
          {
            code: "OUT_OF_STOCK",
            details: {available: 0},
            message: "库存不足",
          },
          {status: 409},
        ),
    });

    await assert.rejects(
      client.request("/orders", z.object({id: z.string()})),
      (error: unknown) => {
        assert.equal(error instanceof ApiError, true);
        assert.equal((error as ApiError).message, "库存不足");
        assert.equal((error as ApiError).status, 409);
        assert.equal((error as ApiError).code, "OUT_OF_STOCK");
        assert.deepEqual((error as ApiError).details, {available: 0});
        return true;
      },
    );
  });

  it("supports empty successful responses when the contract permits them", async () => {
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      fetchImplementation: async () => new Response(null, {status: 204}),
    });

    assert.equal(
      await client.request("/session", z.undefined(), {method: "DELETE"}),
      undefined,
    );
  });

  it("rejects paths that could escape the configured API origin", async () => {
    let fetchCalled = false;
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      fetchImplementation: async () => {
        fetchCalled = true;
        return Response.json({});
      },
    });

    await assert.rejects(
      client.request("https://evil.example.com/orders", z.unknown()),
      /relative API path/,
    );
    await assert.rejects(
      client.request("//evil.example.com/orders", z.unknown()),
      /relative API path/,
    );
    assert.equal(fetchCalled, false);
  });

  it("activates the HTTP transport only for the HTTP data source", async () => {
    assert.equal(
      createApiClientForEnvironment({NEXT_PUBLIC_DATA_SOURCE: "mock"}),
      null,
    );

    let capturedInput: RequestInfo | URL | undefined;
    const client = createApiClientForEnvironment(
      {
        NEXT_PUBLIC_API_BASE_URL: "https://api.example.com/v1",
        NEXT_PUBLIC_DATA_SOURCE: "http",
      },
      async (input) => {
        capturedInput = input;
        return Response.json({ready: true});
      },
    );

    assert.notEqual(client, null);
    await client?.request("/health", z.object({ready: z.boolean()}));
    assert.equal(capturedInput, "https://api.example.com/v1/health");
  });

  it("aborts requests that exceed the configured timeout", async () => {
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      fetchImplementation: async (_input, init) =>
        new Promise((_resolve, reject) => {
          const signal = init?.signal;
          if (!signal) return;
          const rejectWithReason = () => reject(signal.reason);
          if (signal.aborted) rejectWithReason();
          else signal.addEventListener("abort", rejectWithReason, {once: true});
        }),
      timeoutMs: 5,
    });

    await assert.rejects(
      client.request("/slow", z.unknown()),
      (error: unknown) => error instanceof DOMException && error.name === "TimeoutError",
    );
  });
});
