import assert from "node:assert/strict";
import {it} from "node:test";

import {canAccessRoute} from "./domain/routes.ts";
import {deleteNode, fetchAdminNodes, fetchScheduleAdvice, fetchSupplierNodes, isManagedNode, registerNode} from "./scheduler.ts";

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

it("registers SSH-managed nodes without a push key and parses v1.2 node fields", async () => {
  const input = {product_id: 2, node_name: "bj-h100-01", total_cards: 8, mgmt_mode: "ssh" as const, disk_per_card_gb: 200, lease_port_start: 40000, lease_port_end: 40099};
  const registration = await registerNode(input, async (_url, init) => {
    assert.deepEqual(JSON.parse(String(init?.body)), input);
    return Response.json({code: 0, data: {node: {id: 5}}});
  });
  assert.equal(registration.node.id, 5);
  await assert.rejects(registerNode({...input, mgmt_mode: undefined}, async () => Response.json({code: 0, data: {node: {id: 5}}})));
  await assert.rejects(registerNode({...input, lease_port_end: undefined}, async () => {throw new Error("should not fetch");}), (error: Error) => error.message !== "should not fetch");

  const [managed, push] = await fetchSupplierNodes(async () => Response.json({code: 0, data: [
    {...node, mgmt_mode: "ssh", verify_status: "verifying", schedulable: true},
    {...node, id: 6, mgmt_mode: "push", verify_status: "unverified", schedulable: true},
  ]}));
  assert.equal(managed.mgmt_mode, "ssh");
  assert.equal(managed.schedulable, true);
  assert.equal(managed.managed, undefined);
  // Migration 026 defaults verify_status for push nodes too, so "managed" is gated on mgmt_mode only.
  assert.equal(isManagedNode(managed), true);
  assert.equal(isManagedNode(push), false);
});

it("parses the operator node list managed summary (fleet.ManagedExtra) and advice capacity fields", async () => {
  const page = await fetchAdminNodes("", 1, async () => Response.json({code: 0, data: {list: [{...node, mgmt_mode: "ssh", verify_status: "failed", schedulable: false, managed: {
    last_probe: {id: 4, kind: "verify", result: "fail", failed_checks: ["P4"], created_at: "2026-10-28T02:00:00Z"},
    slots: {free: 6, faulty: 2}, ssh_host: "10.0.0.8", ssh_port: 22, host_key_fingerprint: null, host_key_confirmed: false,
  }}], total: 1}}));
  assert.deepEqual(page.list[0].managed?.last_probe?.failed_checks, ["P4"]);
  assert.equal(page.list[0].managed?.slots.free, 6);
});

it("rejects a malformed expected host fingerprint before fetching", async () => {
  const input = {product_id: 2, node_name: "n", total_cards: 1, mgmt_mode: "ssh" as const, lease_port_start: 40000, lease_port_end: 40001, expected_host_fingerprint: "SHA256:short"};
  await assert.rejects(registerNode(input, async () => {throw new Error("should not fetch");}), (error: Error) => error.message !== "should not fetch");
});
