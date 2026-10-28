import assert from "node:assert/strict";
import test from "node:test";

import {isBackendRequestError} from "./api/envelope.ts";
import {
  confirmNodeHostKey,
  fetchNodeSlots,
  fetchProbeReports,
  isSshFingerprint,
  nodeSshInput,
  setSlotWithheld,
  startNodeVerify,
  updateNodeSsh,
} from "./managed-nodes.ts";

const ok = (data: unknown) => Response.json({code: 0, message: "success", data});

test("updateNodeSsh sends the bootstrap password once in the request body only", async () => {
  let body: unknown;
  await updateNodeSsh(3, {host: " 10.0.0.8 ", port: 22, user: "ops", bootstrap_password: "one-time"}, async (url, init) => {
    assert.equal(url, "/api/supplier/nodes/3/ssh");
    assert.equal(init?.method, "PUT");
    body = JSON.parse(String(init?.body));
    return ok(null);
  });
  assert.deepEqual(body, {host: "10.0.0.8", port: 22, user: "ops", bootstrap_password: "one-time"});
  assert.equal(nodeSshInput.safeParse({host: "h", port: 70000, user: "u"}).success, false);
});

test("host key confirm surfaces the backend mismatch code", async () => {
  const error = await confirmNodeHostKey(3, "SHA256:x", async () =>
    Response.json({code: 40001, message: "指纹与观测值不一致"}, {status: 400})).catch((caught) => caught);
  assert.ok(isBackendRequestError(error));
  assert.equal(error.code, 40001);
  assert.equal(error.message, "指纹与观测值不一致");
});

test("verify, probe reports and slots parse list or paged payloads", async () => {
  assert.deepEqual(await startNodeVerify(3, async () => ok({task_id: 11})), {task_id: 11});
  const reports = await fetchProbeReports(3, 5, async (url) => {
    assert.equal(url, "/api/supplier/nodes/3/probe-reports?limit=5");
    return ok({list: [{id: 1, kind: "full", result: "fail", checks: [{id: "P7", ok: null, detail: "无权限读取内核日志"}], created_at: "2026-10-28T02:00:00Z"}]});
  });
  assert.equal(reports[0].checks[0].ok, null);
  const slots = await fetchNodeSlots(3, async () => ok([{gpu_index: 0, state: "leased", lease_no: "L1"}]));
  assert.equal(slots[0].state, "leased");
});

test("slot toggling only sends withheld/free and rejects invalid indexes before fetching", async () => {
  await setSlotWithheld(3, 2, true, async (url, init) => {
    assert.equal(url, "/api/supplier/nodes/3/slots/2");
    assert.deepEqual(JSON.parse(String(init?.body)), {state: "withheld"});
    return ok(null);
  });
  assert.throws(() => setSlotWithheld(3, -1, false, async () => ok(null)));
  assert.throws(() => fetchNodeSlots(0, async () => ok([])));
});

test("isSshFingerprint accepts ssh-keygen SHA256 output", () => {
  assert.equal(isSshFingerprint(`SHA256:${"A".repeat(43)}`), true);
  assert.equal(isSshFingerprint("MD5:aa:bb"), false);
});

test("onboardingStage follows the docs/25 flow from backend fields only", async () => {
  const {onboardingStage} = await import("./managed-nodes.ts");
  assert.equal(onboardingStage({}), "ssh");
  assert.equal(onboardingStage({ssh_host: "h", verify_status: "unverified"}), "verify");
  assert.equal(onboardingStage({ssh_host: "h", verify_status: "verifying"}), "verifying");
  assert.equal(onboardingStage({ssh_host: "h", verify_status: "verifying", host_key_fingerprint: "SHA256:x", host_key_confirmed_at: null}), "confirm_host_key");
  assert.equal(onboardingStage({ssh_host: "h", verify_status: "key_mismatch", host_key_fingerprint: "SHA256:x", host_key_confirmed_at: "t"}), "confirm_host_key");
  assert.equal(onboardingStage({ssh_host: "h", verify_status: "needs_reimage", host_key_fingerprint: "SHA256:x", host_key_confirmed_at: "t"}), "reimage");
  assert.equal(onboardingStage({ssh_host: "h", verify_status: "verified", host_key_fingerprint: "SHA256:x", host_key_confirmed_at: "t"}), "verified");
  assert.equal(onboardingStage({ssh_host: "h", verify_status: "failed"}), "failed");
  assert.equal(onboardingStage({verify_status: "suspended"}), "suspended");
});
