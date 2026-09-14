import assert from "node:assert/strict";
import {it} from "node:test";

import {canAccessRoute} from "./domain/routes.ts";
import {deleteNode, fetchAdminNodes, fetchScheduleAdvice, fetchSupplierNodes, registerNode} from "./scheduler.ts";

const node = {id: 1, supplier_id: 10, product_id: 2, node_name: "gpu-node", status: "offline", total_cards: 8, available_cards: 0, gpu_util_pct: null, vram_util_pct: null, last_heartbeat_at: null};

it("accepts real node/advice envelopes, preserves null telemetry, and never retains list credentials", async () => {
  const nodes = await fetchSupplierNodes(async (url, init) => {
    assert.equal(url, "/api/supplier/nodes"); assert.equal(init?.cache, "no-store");
    return Response.json({code: 0, data: [{...node, node_key_hash: "private-hash", node_key: "must-not-retain"}]});
  });
  assert.deepEqual(nodes, [node]);
  assert.deepEqual(await fetchSupplierNodes(async () => Response.json({code: 0, data: null})), []);
  const advice = await fetchScheduleAdvice("supplier", "ORD &1", async (url) => {
    assert.equal(url, "/api/supplier/schedule-advice?order_no=ORD+%261");
    return Response.json({code: 0, data: {order_no: "ORD &1", product_id: 2, need_cards: 16, summary: "无可调度节点", generated_at: "2026-09-14T00:00:00Z", nodes: null}});
  });
  assert.equal(advice.need_cards, 16); assert.deepEqual(advice.nodes, []);
  assert.deepEqual(await fetchAdminNodes("offline", 2, async (url) => {
    assert.equal(url, "/api/admin/nodes?page=2&page_size=20&status=offline");
    return Response.json({code: 0, data: {list: null, total: 0}});
  }), {list: [], total: 0});
});

it("sends validated registration once and rejects false successful deletion or broken envelopes", async () => {
  const input = {product_id: 2, node_name: " gpu-node ", total_cards: 8};
  const registration = await registerNode(input, async (url, init) => {
    assert.equal(url, "/api/supplier/nodes"); assert.equal(init?.method, "POST");
    assert.deepEqual(JSON.parse(String(init?.body)), {...input, node_name: "gpu-node"});
    return Response.json({code: 0, data: {node: {id: 1, status: ""}, node_key: `nk-${"a".repeat(64)}`}});
  });
  assert.equal(registration.node.id, 1);
  await assert.rejects(registerNode({...input, total_cards: 0}, async () => {throw new Error("should not fetch");}), (error: Error) => error.message !== "should not fetch");
  assert.deepEqual(await deleteNode(1, async (url, init) => {
    assert.equal(url, "/api/supplier/nodes/1"); assert.equal(init?.method, "DELETE");
    return Response.json({code: 0, data: {deleted: true}});
  }), {deleted: true});
  await assert.rejects(deleteNode(1, async () => Response.json({code: 0, data: {deleted: false}})));
  for (const call of [fetchSupplierNodes, (fetcher: typeof fetch) => fetchScheduleAdvice("admin", "ORD1", fetcher), (fetcher: typeof fetch) => registerNode(input, fetcher), (fetcher: typeof fetch) => deleteNode(1, fetcher)]) {
    await assert.rejects(call(async () => Response.json({code: 40001, message: "不属于当前供应方"})), /不属于当前供应方/);
    await assert.rejects(call(async () => Response.json({message: "服务不可用"}, {status: 503})), /服务不可用/);
    await assert.rejects(call(async () => Response.json({code: 0, data: {unexpected: true}})));
  }
});

it("grants node surfaces only to the actual supplier and operator/admin roles", () => {
  for (const role of ["guest", "buyer", "supplier", "vendor", "funder", "operator", "admin"] as const) {
    const context = {role, verificationStatus: "unverified" as const, grants: []};
    assert.equal(canAccessRoute("/console/supplier/nodes", context), role === "supplier");
    assert.equal(canAccessRoute("/admin/nodes", context), role === "operator" || role === "admin");
  }
});
