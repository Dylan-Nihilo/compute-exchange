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
  isUndeterminedCheck,
  recommendedPlan,
  requiredAcks,
  undeterminedInputs,
} from "./model-deploy.ts";

const ok = (data: unknown) => Response.json({code: 0, message: "success", data});
const ORDER = "ORD20261028001";

const plan = (tp: number, dp: number, extra: Record<string, unknown> = {}) => ({
  tp, dp, cards_used: tp * dp, max_model_len: 32768, kv_budget_bytes_per_card: 1, kv_capacity_tokens: 32768,
  context_tight: false, recommended: false, ...extra,
});
const basis = {model_id: 3, model_key: "qwen3-32b-bf16", gpu_model: "H800-80G", cards: 2, vram_bytes_per_card: 85899345920,
  gpu_mem_util_pct: 90, compute_capability: "9.0", driver_version: "550.54.15"};

test("fetchDeployPlans sends gpu_mem_util and parses the modeldeploy.Result shape", async () => {
  const plans = await fetchDeployPlans(ORDER, 3, 0.9, async (url) => {
    assert.equal(url, `/api/buyer/orders/${ORDER}/deploy-plans?model_id=3&gpu_mem_util=0.90`);
    return ok({feasible: true, checks: null, memory: null, basis, plans: [plan(1, 2), plan(2, 1, {recommended: true})]});
  });
  assert.deepEqual(plans.checks, []);
  assert.deepEqual(plans.memory, []);
  assert.equal(recommendedPlan(plans.plans)?.tp, 2);
  assert.equal(recommendedPlan([]), null);
  await fetchDeployPlans(ORDER, 3, 0.876, async (url) => {
    assert.match(String(url), /gpu_mem_util=0\.88$/);
    return ok({feasible: false, plans: [], checks: [], memory: [], basis});
  });
});

test("fetchDeployPlans exposes basis.undetermined reasons and rejects unknown check levels", async () => {
  const result = await fetchDeployPlans(ORDER, 3, 0.9, async () => ok({
    feasible: false, plans: [], memory: [{tp: 4, feasible: false, kv_budget_bytes_per_card: 0, kv_capacity_tokens: 0, reason: "需要 4 张卡, 租约只有 2 张"}],
    checks: [{id: "F3", ok: false, level: "error", message: "各卡当前显存占用无法判定: 轻量探活未采集按卡显存"}],
    basis: {...basis, undetermined: {vram_usage: "轻量探活未采集按卡显存", fatal_xid: "未保留按卡 Xid 记录"}},
  }));
  assert.deepEqual(undeterminedInputs(result).map((row) => row.key), ["fatal_xid", "vram_usage"]);
  assert.equal(undeterminedInputs(result)[1]?.reason, "轻量探活未采集按卡显存");
  assert.equal(isUndeterminedCheck(result.checks[0]!), true);
  assert.equal(result.memory[0]?.reason, "需要 4 张卡, 租约只有 2 张");
  await assert.rejects(fetchDeployPlans(ORDER, 3, 0.9, async () => ok({
    feasible: true, plans: [], memory: [], basis, checks: [{id: "F7", ok: false, level: "ack", message: ""}],
  })));
});

test("fetchDeployPlans surfaces the fleet-disabled 50000 message unchanged", async () => {
  const message = "托管租约能力尚未上线(S2 未接入), 暂无法计算部署方案";
  await assert.rejects(
    fetchDeployPlans(ORDER, 3, 0.9, async () => Response.json({code: 50000, message}, {status: 500})),
    (error) => isBackendRequestError(error) && error.code === 50000 && error.message === message,
  );
});

test("requiredAcks follows confirm checks with ack; checkTone follows level", () => {
  const checks = [
    {id: "F5", ok: false, level: "warning", message: "卡间无 NVLink"},
    {id: "F7", ok: false, level: "confirm", message: "许可证受限", ack: "license_ack"},
    {id: "F8", ok: true, level: "info", message: "已在 H800-80G 上真机验证"},
  ] as const;
  assert.deepEqual(requiredAcks(checks), {license: true, untested: false});
  assert.deepEqual(requiredAcks([{id: "F8", ok: false, level: "confirm", message: "", ack: "untested_ack"}]), {license: false, untested: true});
  assert.deepEqual(requiredAcks([]), {license: false, untested: false});
  assert.equal(checkTone(checks[0]), "warn");
  assert.equal(checkTone(checks[1]), "confirm");
  assert.equal(checkTone({id: "F2", ok: false, level: "error", message: "驱动过低"}), "block");
  assert.equal(checkTone(checks[2]), "ok");
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
      return Response.json({code: 40001, message: "需确认许可证", data: {checks: [{id: "F7", ok: false, level: "confirm", message: "许可证受限", ack: "license_ack"}]}}, {status: 400});
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
