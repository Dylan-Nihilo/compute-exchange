import assert from "node:assert/strict";
import test from "node:test";

import {isBackendRequestError} from "./api/envelope.ts";
import {
  checkTone,
  createDeployment,
  deployErrorChecks,
  deploymentInput,
  engineCommands,
  fetchDeployPlans,
  fetchDeploymentHealth,
  fetchDeploymentLogs,
  isLiveDeployment,
  recommendedPlan,
  requiredAcks,
} from "./model-deploy.ts";

const ok = (data: unknown) => Response.json({code: 0, message: "success", data});
const ORDER = "ORD20261028001";

test("fetchDeployPlans parses plans and checks; recommendedPlan picks the flagged plan", async () => {
  const plans = await fetchDeployPlans(ORDER, 3, async (url) => {
    assert.equal(url, `/api/buyer/orders/${ORDER}/deploy-plans?model_id=3`);
    return ok({feasible: true, checks: null, plans: [
      {tp: 1, dp: 2, cards_used: 2, max_model_len: 8192},
      {tp: 2, dp: 1, cards_used: 2, max_model_len: 32768, recommended: true},
    ]});
  });
  assert.deepEqual(plans.checks, []);
  assert.equal(recommendedPlan(plans.plans)?.tp, 2);
  assert.equal(recommendedPlan([]), null);
});

test("requiredAcks: F7/F8 need acks; restricted licence always needs licence ack; F5 is advisory", () => {
  const checks = [
    {id: "F5", ok: false, level: "warn", message: "无 NVLink"},
    {id: "F7", ok: true, level: "ack", message: "许可证受限"},
    {id: "F8", ok: true, level: "info", message: ""},
  ];
  assert.deepEqual(requiredAcks(checks), {license: true, untested: false});
  assert.deepEqual(requiredAcks([], {commercial_use: "restricted"}), {license: true, untested: false});
  assert.equal(checkTone(checks[0]!), "warn");
  assert.equal(checkTone({id: "F2", ok: false, message: "显存不足"}), "block");
  assert.equal(checkTone({id: "F1", ok: true, message: ""}), "ok");
});

test("gpu_mem_util must stay within 0.80–0.95", () => {
  const base = {model_id: 1, tp: 1, dp: 1, max_model_len: 4096, canary_enabled: true, license_ack: false, untested_ack: false};
  assert.equal(deploymentInput.safeParse({...base, gpu_mem_util: 0.9}).success, true);
  assert.equal(deploymentInput.safeParse({...base, gpu_mem_util: 0.79}).success, false);
  assert.equal(deploymentInput.safeParse({...base, gpu_mem_util: 0.96}).success, false);
});

test("createDeployment keeps 40001 data.checks for the form", async () => {
  const input = {model_id: 1, tp: 1, dp: 1, max_model_len: 4096, gpu_mem_util: 0.9, canary_enabled: true, license_ack: false, untested_ack: false};
  let caught: unknown;
  try {
    await createDeployment(ORDER, input, async (_url, init) => {
      assert.equal(init?.method, "POST");
      return Response.json({code: 40001, message: "需确认许可证", data: {checks: [{id: "F7", ok: false, level: "ack", message: "许可证受限"}]}}, {status: 400});
    });
  } catch (error) {
    caught = error;
  }
  assert.ok(isBackendRequestError(caught));
  assert.equal(caught.message, "需确认许可证");
  assert.equal(deployErrorChecks(caught.data)[0]?.id, "F7");
  assert.deepEqual(deployErrorChecks(null), []);
});

test("health samples coerce DECIMAL strings and TINYINT flags", async () => {
  const samples = await fetchDeploymentHealth(ORDER, "DEP-001", "24h", async (url) => {
    assert.equal(url, `/api/buyer/orders/${ORDER}/deployments/DEP-001/health?range=24h`);
    return ok([{sampled_at: "2026-10-28T00:00:00Z", kv_usage_pct: "42.50", ttft_p50_ms: 120, throttled: 0, container_up: 1, gpu_temp_max_c: null}]);
  });
  assert.equal(samples[0]?.kv_usage_pct, 42.5);
  assert.equal(samples[0]?.throttled, false);
  assert.equal(samples[0]?.container_up, true);
  assert.equal(samples[0]?.gpu_temp_max_c, null);
  assert.equal(samples[0]?.prompt_tokens_per_s, null);
});

test("logs accept several shapes and 42900 surfaces as returned", async () => {
  assert.equal(await fetchDeploymentLogs(ORDER, "DEP-001", async () => ok({lines: ["a", "b"]})), "a\nb");
  assert.equal(await fetchDeploymentLogs(ORDER, "DEP-001", async () => ok("raw")), "raw");
  await assert.rejects(
    fetchDeploymentLogs(ORDER, "DEP-001", async () => Response.json({code: 42900, message: "日志读取过于频繁"}, {status: 429})),
    (error) => isBackendRequestError(error) && error.message === "日志读取过于频繁",
  );
});

test("isLiveDeployment and engineCommands", () => {
  assert.equal(isLiveDeployment("running"), true);
  assert.equal(isLiveDeployment("failed"), false);
  assert.equal(engineCommands("l-abc", "gw.omnisline.com", 2222).tunnel, "ssh -p 2222 -N -L 8000:omnis-engine:8000 l-abc@gw.omnisline.com");
});
