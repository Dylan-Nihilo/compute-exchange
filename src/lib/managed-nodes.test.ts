import assert from "node:assert/strict";
import test from "node:test";

import {isBackendRequestError} from "./api/envelope.ts";
import {defaultManagedNodeFields, managedNodeInput, managedNodeInputError} from "./managed-node-registration.ts";
import {
  confirmNodeHostKey,
  confirmNodeReimage,
  fetchNodeOnboarding,
  fetchNodeSlots,
  fetchProbeReports,
  isSshFingerprint,
  nodeSshInput,
  onboardingStage,
  setNodeDrain,
  setSlotWithheld,
  startNodeVerify,
  updateNodeSsh,
} from "./managed-nodes.ts";

const ok = (data: unknown) => Response.json({code: 0, message: "success", data});
const fp = `SHA256:${"A".repeat(43)}`;
const hostKey = {fingerprint: null, confirmed: false, confirmed_at: null, check_command: "ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub"};
const fleetNode = {id: 3, verify_status: "unverified", schedulable: true, ssh_host: "10.0.0.8", ssh_port: 22, ssh_user: "ops", host_key_fingerprint: null, host_key_confirmed_at: null, last_probe_ok_at: null, product_id: 9};

test("onboarding parses fleet.Onboarding exactly, normalising null lists", async () => {
  const data = await fetchNodeOnboarding(3, async (url) => {
    assert.equal(url, "/api/supplier/nodes/3/onboarding");
    return ok({
      node_id: 3, verify_status: "unverified", authorized_keys_line: 'from="1.2.3.4" ssh-ed25519 AAAA omnis-node-3',
      controller_egress_ips: ["1.2.3.4"], gateway_egress_ips: null, lease_port_start: 40000, lease_port_end: 40099,
      ssh_host: null, ssh_port: null, ssh_user: null, host_key: hostKey, firewall_scripts: null, requirements: null,
    });
  });
  assert.deepEqual(data.gateway_egress_ips, []);
  assert.deepEqual(data.firewall_scripts, {});
  assert.deepEqual(data.requirements, []);
  assert.equal(onboardingStage(data), "ssh");
});

test("onboarding surfaces the backend 50000 when egress IPs are not configured", async () => {
  const error = await fetchNodeOnboarding(3, async () =>
    Response.json({code: 50000, message: "平台出口 IP 未配置(accessgw.egress_ips)"}, {status: 500})).catch((caught) => caught);
  assert.ok(isBackendRequestError(error));
  assert.equal(error.code, 50000);
});

test("updateNodeSsh sends the password once, drops a blank fingerprint and parses {node, bootstrap, host_key}", async () => {
  let body: unknown;
  const result = await updateNodeSsh(3, {host: " 10.0.0.8 ", port: 22, user: "ops", bootstrap_password: "one-time", expected_host_fingerprint: " "}, async (url, init) => {
    assert.equal(url, "/api/supplier/nodes/3/ssh");
    assert.equal(init?.method, "PUT");
    body = JSON.parse(String(init?.body));
    return ok({node: fleetNode, bootstrap: "installed", host_key: hostKey});
  });
  assert.deepEqual(body, {host: "10.0.0.8", port: 22, user: "ops", bootstrap_password: "one-time"});
  assert.equal(result.bootstrap, "installed");
  assert.equal(nodeSshInput.safeParse({host: "h", port: 70000, user: "u"}).success, false);
  assert.equal(nodeSshInput.safeParse({host: "h", port: 22, user: "Root"}).success, false);
  assert.equal(nodeSshInput.safeParse({host: "h", port: 22, user: "ops", expected_host_fingerprint: "SHA256:short"}).success, false);
  const pinned = nodeSshInput.parse({host: "h", port: 22, user: "ops", expected_host_fingerprint: fp});
  assert.equal(pinned.expected_host_fingerprint, fp);
});

test("ssh fingerprint mismatch keeps the backend 40900 message", async () => {
  const message = "主机指纹 SHA256:b 与已确认/预期指纹 SHA256:a 不一致: 握手阶段已中止, 一次性密码未发送";
  const error = await updateNodeSsh(3, {host: "h", port: 22, user: "ops"}, async () =>
    Response.json({code: 40900, message}, {status: 409})).catch((caught) => caught);
  assert.ok(isBackendRequestError(error));
  assert.equal(error.code, 40900);
  assert.equal(error.message, message);
});

test("host key confirm returns {confirmed, task_id} and surfaces the 40001 mismatch", async () => {
  assert.deepEqual(await confirmNodeHostKey(3, ` ${fp} `, async (_url, init) => {
    assert.deepEqual(JSON.parse(String(init?.body)), {fingerprint: fp});
    return ok({confirmed: true, task_id: 0});
  }), {confirmed: true, task_id: 0});
  const error = await confirmNodeHostKey(3, fp, async () =>
    Response.json({code: 40001, message: "指纹与平台观测值不一致"}, {status: 400})).catch((caught) => caught);
  assert.ok(isBackendRequestError(error));
  assert.equal(error.code, 40001);
});

test("verify, drain and reimage parse their documented payloads", async () => {
  assert.deepEqual(await startNodeVerify(3, async () => ok({task_id: 11})), {task_id: 11});
  assert.deepEqual(await setNodeDrain(3, true, async (url) => {
    assert.equal(url, "/api/supplier/nodes/3/drain");
    return ok({schedulable: false});
  }), {schedulable: false});
  assert.deepEqual(await confirmNodeReimage(3, async () => ok({task_id: 12})), {task_id: 12});
});

test("probe reports parse fleet checks with name/required/skipped and clamp the limit", async () => {
  const reports = await fetchProbeReports(3, 500, async (url) => {
    assert.equal(url, "/api/supplier/nodes/3/probe-reports?limit=50");
    return ok([{
      id: 1, node_id: 3, kind: "verify", result: "fail", inventory: null, created_at: "2026-10-28T02:00:00Z",
      checks: [
        {id: "P1", name: "SSH 连通", ok: true, required: true, detail: ""},
        {id: "P5", name: "Docker", ok: false, required: true, skipped: true, detail: "前置检查未通过"},
        {id: "P10", name: "带宽", ok: false, required: false, detail: "低于建议值"},
      ],
    }]);
  });
  assert.equal(reports[0].checks[0].skipped, false);
  assert.equal(reports[0].checks[1].skipped, true);
  assert.equal(reports[0].checks[2].required, false);
  assert.equal(reports[0].inventory, null);
});

test("slots parse lease_id and toggling parses {gpu_index, state}", async () => {
  const slots = await fetchNodeSlots(3, async () => ok([{id: 1, node_id: 3, gpu_index: 0, gpu_uuid: "GPU-1", pci_bus_id: "0000:01:00.0", vram_mb: 81920, topo_group: "nv0", state: "leased", lease_id: 7, state_changed_at: "2026-10-28T02:00:00Z"}]));
  assert.equal(slots[0].lease_id, 7);
  const toggled = await setSlotWithheld(3, 2, true, async (url, init) => {
    assert.equal(url, "/api/supplier/nodes/3/slots/2");
    assert.deepEqual(JSON.parse(String(init?.body)), {state: "withheld"});
    return ok({gpu_index: 2, state: "withheld"});
  });
  assert.deepEqual(toggled, {gpu_index: 2, state: "withheld"});
  assert.throws(() => setSlotWithheld(3, -1, false, async () => ok(null)));
  assert.throws(() => fetchNodeSlots(0, async () => ok([])));
});

test("isSshFingerprint matches the backend regex exactly (no padding)", () => {
  assert.equal(isSshFingerprint(fp), true);
  assert.equal(isSshFingerprint(`SHA256:${"A".repeat(43)}=`), false);
  assert.equal(isSshFingerprint("MD5:aa:bb"), false);
});

test("onboardingStage follows the docs/25 flow from onboarding fields only", () => {
  const at = (verify_status: Parameters<typeof onboardingStage>[0]["verify_status"], ssh_host: string | null = "h", fingerprint: string | null = null, confirmed = false) =>
    onboardingStage({ssh_host, verify_status, host_key: {fingerprint, confirmed}});
  assert.equal(at("unverified", null), "ssh");
  assert.equal(at("unverified"), "verify");
  assert.equal(at("verifying"), "verifying");
  assert.equal(at("unverified", "h", fp, false), "confirm_host_key");
  assert.equal(at("key_mismatch", "h", fp, true), "confirm_host_key");
  assert.equal(at("needs_reimage", "h", fp, true), "reimage");
  assert.equal(at("verified", "h", fp, true), "verified");
  assert.equal(at("failed"), "failed");
  assert.equal(at("suspended", null), "suspended");
});

test("managed node registration mirrors fleet RegisterManagedNode validation", () => {
  const fields = {...defaultManagedNodeFields};
  assert.match(managedNodeInputError(fields, 8, true) ?? "", /容器交付须填写/);
  assert.equal(managedNodeInputError(fields, 8, false), null);
  assert.deepEqual(managedNodeInput(fields, 8, false), {mgmt_mode: "ssh", lease_port_start: 40000, lease_port_end: 40099});
  assert.match(managedNodeInputError(fields, 65, false) ?? "", /1-64/);
  assert.match(managedNodeInputError({...fields, portEnd: "40004"}, 8, false) ?? "", /卡数\+1/);
  assert.match(managedNodeInputError({...fields, portEnd: "41000"}, 8, false) ?? "", /1000/);
  assert.match(managedNodeInputError({...fields, expectedFingerprint: "SHA256:x"}, 8, false) ?? "", /SHA256/);
  assert.deepEqual(managedNodeInput({...fields, diskPerCardGb: "200", expectedFingerprint: ` ${fp} `}, 8, true), {
    mgmt_mode: "ssh", disk_per_card_gb: 200, lease_port_start: 40000, lease_port_end: 40099, expected_host_fingerprint: fp,
  });
});
