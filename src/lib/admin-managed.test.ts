import assert from "node:assert/strict";
import test from "node:test";

import {isBackendRequestError} from "./api/envelope.ts";
import {
  changeNodeSuspension,
  fetchAdminDeployments,
  fetchAdminLeases,
  fetchDeadNodeTasks,
  retryNodeTask,
  suspensionAction,
} from "./admin-managed.ts";

const ok = (data: unknown) => Response.json({code: 0, message: "success", data});

test("suspensionAction only offers suspend for verified and resume for suspended nodes", () => {
  assert.equal(suspensionAction("verified"), "suspend");
  assert.equal(suspensionAction("suspended"), "resume");
  assert.equal(suspensionAction("pending"), null);
  assert.equal(suspensionAction(undefined), null);
});

test("changeNodeSuspension posts to the admin BFF and surfaces backend errors as-is", async () => {
  await changeNodeSuspension(7, "suspend", async (url, init) => {
    assert.equal(url, "/api/admin/nodes/7/suspend");
    assert.equal(init?.method, "POST");
    return ok(null);
  });
  await assert.rejects(
    changeNodeSuspension(7, "resume", async () => Response.json({code: 40900, message: "节点状态不允许恢复", data: null}, {status: 409})),
    (error) => isBackendRequestError(error) && error.message === "节点状态不允许恢复",
  );
});

test("fetchAdminLeases drops empty filters and accepts {list,total}", async () => {
  const page = await fetchAdminLeases({state: "active", node_id: "", buyer_id: " 12 ", page: 2}, async (url) => {
    assert.equal(url, "/api/admin/leases?state=active&buyer_id=12&page=2&page_size=20");
    return ok({list: [{id: 1, lease_no: "L1", buyer_id: 12, node_id: 3, cards: 2, state: "active"}], total: 41});
  });
  assert.equal(page.total, 41);
  assert.equal(page.list[0]?.lease_no, "L1");
});

test("dead tasks accept a bare array; retry posts by id", async () => {
  const tasks = await fetchDeadNodeTasks(async (url) => {
    assert.equal(url, "/api/admin/node-tasks?state=dead");
    return ok([{id: 5, node_id: 3, kind: "provision", state: "dead", attempts: 5}]);
  });
  assert.deepEqual(tasks.list.map((task) => task.id), [5]);
  assert.equal(tasks.total, 1);
  await retryNodeTask(5, async (url, init) => {
    assert.equal(url, "/api/admin/node-tasks/5/retry");
    assert.equal(init?.method, "POST");
    return ok(null);
  });
});

test("fetchAdminDeployments passes state/health filters and defaults health to unknown", async () => {
  const page = await fetchAdminDeployments({state: "running", health: "", page: 1}, async (url) => {
    assert.equal(url, "/api/admin/deployments?state=running&page=1&page_size=20");
    return ok({list: [{deploy_no: "D1", tp: 2, dp: 1, max_model_len: 32768, state: "running"}]});
  });
  assert.equal(page.list[0]?.health, "unknown");
  const empty = await fetchAdminDeployments({}, async (url) => {
    assert.equal(url, "/api/admin/deployments");
    return ok(null);
  });
  assert.deepEqual(empty, {list: [], total: 0});
});
