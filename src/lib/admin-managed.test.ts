import assert from "node:assert/strict";
import test from "node:test";

import {isBackendRequestError} from "./api/envelope.ts";
import {
  canRetryNodeTask,
  changeNodeSuspension,
  fetchAdminLeases,
  fetchAdminSessions,
  fetchNodeTasks,
  retryNodeTask,
  suspensionAction,
} from "./admin-managed.ts";

const ok = (data: unknown) => Response.json({code: 0, message: "success", data});

test("suspensionAction allows suspend for any non-suspended ssh node and resume for suspended", () => {
  // fleet AdminSuspend accepts every non-suspended ssh node (40900 "节点已处于停用状态" otherwise).
  assert.equal(suspensionAction("verified"), "suspend");
  assert.equal(suspensionAction("failed"), "suspend");
  assert.equal(suspensionAction("unverified"), "suspend");
  assert.equal(suspensionAction("suspended"), "resume");
  assert.equal(suspensionAction(undefined), null);
});

test("changeNodeSuspension posts to the admin BFF and surfaces backend errors as-is", async () => {
  assert.deepEqual(await changeNodeSuspension(7, "suspend", async (url, init) => {
    assert.equal(url, "/api/admin/nodes/7/suspend");
    assert.equal(init?.method, "POST");
    assert.deepEqual(JSON.parse(String(init?.body)), {reason: "机房断电"});
    return ok({verify_status: "suspended"});
  }, " 机房断电 "), {verify_status: "suspended"});
  assert.deepEqual(await changeNodeSuspension(7, "resume", async (_url, init) => {
    assert.equal(init?.body, undefined);
    return ok({verify_status: "unverified", task_id: 31});
  }), {verify_status: "unverified", task_id: 31});
  assert.throws(() => changeNodeSuspension(7, "suspend", async () => ok(null), "停".repeat(201)));
  await assert.rejects(
    changeNodeSuspension(7, "resume", async () => Response.json({code: 40900, message: "节点状态不允许恢复", data: null}, {status: 409})),
    (error) => isBackendRequestError(error) && error.message === "节点状态不允许恢复",
  );
});

const lease = {
  id: 1,
  lease_no: "l-abcdefgh",
  order_id: 9,
  buyer_id: 12,
  product_id: 4,
  node_id: 3,
  cards: 2,
  delivery_kind: "container",
  state: "active",
  upstream_port: 41001,
  upstream_host_key_fp: null,
  container_name: "omnis-l-abcdefgh",
  volume_name: "omnis-l-abcdefgh",
  access_until: "2026-11-01T00:00:00Z",
  access_changed_at: "2026-10-28T00:00:00Z",
  grace_until: null,
  provisioned_at: "2026-10-28T00:05:00Z",
  purged_at: null,
  fail_reason: null,
  resource_alert: null,
  outage_remedy: "extend",
  created_at: "2026-10-28T00:00:00Z",
  updated_at: "2026-10-28T00:05:00Z",
};

const page = (list: unknown[], total = list.length) => ok({list, total, page: 1, page_size: 20});

test("fetchAdminLeases drops empty filters, always pages and parses the exact fleet.Lease", async () => {
  const result = await fetchAdminLeases({state: "active", node_id: "", buyer_id: " 12 ", page: 2}, async (url) => {
    assert.equal(url, "/api/admin/leases?state=active&buyer_id=12&page=2&page_size=20");
    return page([lease], 41);
  });
  assert.equal(result.total, 41);
  assert.equal(result.list[0]?.lease_no, "l-abcdefgh");
  assert.equal(result.list[0]?.outage_remedy, "extend");
  await fetchAdminLeases({}, async (url) => {
    assert.equal(url, "/api/admin/leases?page=1&page_size=20");
    return page([]);
  });
  // Unknown lease state or remedy is a contract break, not something to render.
  await assert.rejects(fetchAdminLeases({}, async () => page([{...lease, state: "running"}])));
  await assert.rejects(fetchAdminLeases({}, async () => page([{...lease, outage_remedy: ""}])));
  await assert.rejects(
    fetchAdminLeases({state: "bogus"}, async () =>
      Response.json({code: 40001, message: "state 仅支持 reserved/pending/provisioning", data: null}, {status: 400})),
    (error) => isBackendRequestError(error) && error.message.startsWith("state 仅支持"),
  );
});

test("fetchAdminSessions validates lease_no and parses buyer_id/key_name", async () => {
  const session = {
    id: 3,
    lease_no: "l-abcdefgh",
    buyer_id: 12,
    remote_ip: "203.0.113.5",
    auth_method: "publickey",
    key_fingerprint: "SHA256:x",
    key_name: "laptop",
    started_at: "2026-10-28T00:00:00Z",
    ended_at: null,
    bytes_up: 10,
    bytes_down: 20,
    end_reason: null,
  };
  const result = await fetchAdminSessions({lease_no: " l-abcdefgh ", ip: ""}, async (url) => {
    assert.equal(url, "/api/admin/access-sessions?lease_no=l-abcdefgh&page=1&page_size=20");
    return page([session]);
  });
  assert.equal(result.list[0]?.buyer_id, 12);
  assert.equal(result.list[0]?.key_name, "laptop");
  await assert.rejects(fetchAdminSessions({lease_no: "L1"}, async () => assert.fail("must not fetch")), /租约号格式/);
});

test("node tasks: state filter, exact fleet.Task, retry result and retry gating", async () => {
  const task = {
    id: 5,
    node_id: 3,
    lease_id: 1,
    deployment_id: null,
    kind: "stop",
    state: "dead",
    priority: 0,
    attempts: 5,
    max_attempts: 5,
    run_after: "2026-10-28T00:00:00Z",
    locked_until: null,
    payload: {lease_id: 1},
    result: null,
    last_error: "ssh: timeout",
    created_at: "2026-10-28T00:00:00Z",
    updated_at: "2026-10-28T00:01:00Z",
  };
  const tasks = await fetchNodeTasks({state: "dead", node_id: "3"}, async (url) => {
    assert.equal(url, "/api/admin/node-tasks?state=dead&node_id=3&page=1&page_size=20");
    return page([task]);
  });
  assert.deepEqual(tasks.list.map((item) => item.id), [5]);
  await fetchNodeTasks({state: ""}, async (url) => {
    assert.equal(url, "/api/admin/node-tasks?page=1&page_size=20");
    return page([]);
  });
  assert.deepEqual(
    await retryNodeTask(5, async (url, init) => {
      assert.equal(url, "/api/admin/node-tasks/5/retry");
      assert.equal(init?.method, "POST");
      return ok({task_id: 5, state: "pending"});
    }),
    {task_id: 5, state: "pending"},
  );
  await assert.rejects(
    retryNodeTask(6, async () => Response.json({code: 40900, message: "开通任务死信已自动善后(换节点或取消订单退款), 不可手动重试", data: null}, {status: 409})),
    (error) => isBackendRequestError(error) && error.message.includes("不可手动重试"),
  );
  assert.equal(canRetryNodeTask({state: "dead", kind: "stop"}), true);
  assert.equal(canRetryNodeTask({state: "dead", kind: "provision"}), false);
  assert.equal(canRetryNodeTask({state: "failed", kind: "stop"}), false);
});
