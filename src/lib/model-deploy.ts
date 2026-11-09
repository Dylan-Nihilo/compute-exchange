import {z} from "zod";

import {pagedPayload} from "./admin-managed.ts";
import {jsonInit, listPayload, requestEnvelope} from "./api/envelope.ts";

// One-click model deployment on a managed lease (docs/27 §27.8 buyer).

/** DECIMAL columns may arrive as strings; null/absent stays null. */
const decimal = z.preprocess(
  (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : value),
  z.number().finite().nullable().optional(),
).transform((value) => value ?? null);

/** modeldeploy.PublicModel (GET /models): active catalogue entries only, newest first. */
export const catalogModelSchema = z.object({
  id: z.number().int().positive(),
  model_key: z.string(),
  display_name: z.string(),
  source: z.string(),
  repo: z.string(),
  revision: z.string(),
  quant: z.string(),
  weights_bytes: z.number().int().nonnegative(),
  min_compute_capability: z.string(),
  valid_tp: z.array(z.number().int().positive()).nullable().transform((value) => value ?? []),
  max_model_len: z.number().int().nonnegative(),
  min_context_tokens: z.number().int().nonnegative(),
  license: z.string(),
  commercial_use: z.enum(["allowed", "restricted", "unknown"]),
  // GPU models (gpu_catalog model_name) with a result=pass on-machine verification; [] when none.
  verified_gpu_models: z.array(z.string()).nullable().transform((value) => value ?? []),
});
export type CatalogModel = z.infer<typeof catalogModelSchema>;

/** modeldeploy.Plan. */
export const deployPlanSchema = z.object({
  tp: z.number().int().positive(),
  dp: z.number().int().positive(),
  cards_used: z.number().int().positive(),
  max_model_len: z.number().int().positive(),
  kv_budget_bytes_per_card: z.number().int(),
  kv_capacity_tokens: z.number().int(),
  // Suggested context < 2 × min_context_tokens.
  context_tight: z.boolean(),
  recommended: z.boolean(),
});
export type DeployPlan = z.infer<typeof deployPlanSchema>;

/** `info` passed; `error` blocks; `warning` is advisory; `confirm` is feasible but needs `ack` on submit. */
export const checkLevels = ["info", "error", "warning", "confirm"] as const;
export const deployAcks = ["license_ack", "untested_ack"] as const;

/** modeldeploy.Check (M1, M2, F1–F8). */
export const feasibilityCheckSchema = z.object({
  id: z.string(),
  ok: z.boolean(),
  level: z.enum(checkLevels),
  message: z.string(),
  ack: z.enum(deployAcks).optional(),
});
export type FeasibilityCheck = z.infer<typeof feasibilityCheckSchema>;

/** modeldeploy.MemoryEval: per-tp memory/context evaluation; `reason` only when infeasible. */
export const memoryEvalSchema = z.object({
  tp: z.number().int().positive(),
  feasible: z.boolean(),
  kv_budget_bytes_per_card: z.number().int(),
  kv_capacity_tokens: z.number().int(),
  reason: z.string().optional(),
});
export type MemoryEval = z.infer<typeof memoryEvalSchema>;

/** Inputs the lease data source has not collected yet (lease_source.go Input* keys). */
export const undeterminedInputLabels: Record<string, string> = {
  vram_usage: "各卡当前显存占用（F3）",
  model_cache: "模型缓存区剩余空间（F4）",
  nvlink: "卡间 NVLink 互联（F5）",
  fatal_xid: "近 1 小时致命 Xid（F6）",
};

/** modeldeploy.Basis, the evaluation input summary. Only the fields the page reads are pinned. */
const basisSchema = z.object({
  model_id: z.number().int(),
  model_key: z.string(),
  gpu_model: z.string(),
  cards: z.number().int().nonnegative(),
  gpu_mem_util_pct: z.number().int(),
  // {input key: buyer-facing reason}; omitted when every input was collected.
  undetermined: z.record(z.string(), z.string()).optional(),
}).passthrough();

export const deployPlansSchema = z.object({
  feasible: z.boolean(),
  // [] when feasible=false.
  plans: z.array(deployPlanSchema).nullable().transform((value) => value ?? []),
  checks: z.array(feasibilityCheckSchema).nullable().transform((value) => value ?? []),
  memory: z.array(memoryEvalSchema).nullable().transform((value) => value ?? []),
  basis: basisSchema,
});
export type DeployPlans = z.infer<typeof deployPlansSchema>;

/** `basis.undetermined` as display rows, in a stable order. */
export function undeterminedInputs(plans: Pick<DeployPlans, "basis">) {
  return Object.entries(plans.basis.undetermined ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, reason]) => ({key, label: undeterminedInputLabels[key] ?? key, reason}));
}

export const deployStates = ["pending", "checking", "pulling", "starting", "running", "restarting", "stopping", "stopped", "failed"] as const;
export const deployStateCopy: Record<string, string> = {
  pending: "排队中",
  checking: "检查中",
  pulling: "拉取权重",
  starting: "启动中",
  running: "运行中",
  restarting: "重启中",
  stopping: "停止中",
  stopped: "已停止",
  failed: "失败",
};
export const healthCopy: Record<string, string> = {unknown: "未知", healthy: "健康", degraded: "降级", unhealthy: "异常"};

const nullableText = z.string().nullable().optional().transform((value) => value ?? null);

/**
 * modeldeploy.DeploymentView (deploy_service.go:219). `access` is only set while the engine is
 * reachable; `cache` carries weight-pull progress; `events` is detail-only (omitempty).
 */
export const deploymentSchema = z.object({
  deploy_no: z.string().min(1),
  order_no: z.string(),
  model: z.object({id: z.number().int().positive(), model_key: z.string(), display_name: z.string()}),
  state: z.string(),
  health: z.string().default("unknown"),
  health_reason: nullableText,
  health_reason_text: nullableText,
  tp: z.number().int().positive(),
  dp: z.number().int().positive(),
  max_model_len: z.number().int().nonnegative(),
  gpu_mem_util: decimal,
  gpu_uuids: z.array(z.string()).nullable().optional().transform((value) => value ?? []),
  canary_enabled: z.boolean(),
  engine_cpus: z.number().int().nullable().optional().transform((value) => value ?? null),
  engine_memory_gb: z.number().int().nullable().optional().transform((value) => value ?? null),
  access: z
    .object({base_url: z.string(), served_model: z.string(), port_forward_cmd: z.string().optional()})
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  cache: z
    .object({state: z.string(), bytes_done: z.number().nonnegative(), weights_bytes: z.number().nonnegative()})
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  restart_count: z.number().int().nonnegative(),
  last_restart_at: nullableText,
  next_restart_at: nullableText,
  fail_reason: nullableText,
  stop_reason: nullableText,
  started_at: nullableText,
  stopped_at: nullableText,
  events: z
    .array(z.object({kind: z.string(), reason: nullableText, detail: nullableText, created_at: z.string()}))
    .optional()
    .transform((value) => value ?? []),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Deployment = z.infer<typeof deploymentSchema>;

/** Operator list rows add buyer_id / node_id (handler_deploy.go:153, SuccessPage). */
export const adminDeploymentSchema = deploymentSchema.extend({
  buyer_id: z.number().int().positive().nullable().optional().transform((value) => value ?? null),
  node_id: z.number().int().positive().nullable().optional().transform((value) => value ?? null),
});
export type AdminDeployment = z.infer<typeof adminDeploymentSchema>;

/** deploy_repo.go:207 SampleRow; bucketed ranges average numbers and turn flags into 0–1 ratios. */
export const healthSampleSchema = z.object({
  t: z.string(),
  health: z.string().optional(),
  container_up: decimal,
  health_ok: decimal,
  models_ok: decimal,
  canary_ok: decimal,
  canary_ms: decimal,
  requests_running: decimal,
  requests_waiting: decimal,
  kv_usage_pct: decimal,
  ttft_p50_ms: decimal,
  ttft_p95_ms: decimal,
  gen_tokens_per_s: decimal,
  prompt_tokens_per_s: decimal,
  preemptions: decimal,
  gpu_temp_max_c: decimal,
  throttled: decimal,
});
export type HealthSample = z.infer<typeof healthSampleSchema>;
export const healthRanges = ["1h", "24h", "7d"] as const;
export type HealthRange = (typeof healthRanges)[number];

/** deploy_views.go:143 HealthSeriesView. */
export const healthSeriesSchema = z.object({
  deploy_no: z.string(),
  range: z.enum(healthRanges),
  bucket_seconds: z.number().int().positive(),
  health: z.string(),
  health_reason: nullableText,
  health_reason_text: nullableText,
  baseline_canary_ms: z.number().nullable().optional().transform((value) => value ?? null),
  points: z.array(healthSampleSchema).nullable().transform((value) => value ?? []),
});
export type HealthSeries = z.infer<typeof healthSeriesSchema>;

/** deploy_views.go:190 LogsView: `live` = docker logs now; `stored` = tail kept when the deployment failed. */
export const logsSchema = z.object({
  deploy_no: z.string(),
  source: z.enum(["live", "stored"]),
  lines: z.array(z.string()).nullable().transform((value) => value ?? []),
});
export type DeploymentLogsView = z.infer<typeof logsSchema>;

export const GPU_MEM_UTIL_MIN = 0.8;
export const GPU_MEM_UTIL_MAX = 0.95;
export const GPU_MEM_UTIL_DEFAULT = 0.9;

export const deploymentInput = z.object({
  model_id: z.number().int().positive(),
  tp: z.number().int().positive(),
  dp: z.number().int().positive(),
  max_model_len: z.number().int().positive(),
  gpu_mem_util: z.number().min(GPU_MEM_UTIL_MIN, "显存利用率不低于 0.80").max(GPU_MEM_UTIL_MAX, "显存利用率不高于 0.95"),
  canary_enabled: z.boolean(),
  license_ack: z.boolean(),
  untested_ack: z.boolean(),
});
export type DeploymentInput = z.infer<typeof deploymentInput>;

const base = (orderNo: string) => `/api/buyer/orders/${encodeURIComponent(orderNo)}`;

export function fetchCatalogModels(fetchImplementation?: typeof fetch) {
  return requestEnvelope("/api/market-proxy/models", listPayload(catalogModelSchema), {fallback: "模型目录读取失败", fetchImplementation});
}

/** Two-decimal form the backend accepts for `gpu_mem_util` (0.80–0.95). */
export function formatGpuMemUtil(value: number) {
  const bounded = Math.min(GPU_MEM_UTIL_MAX, Math.max(GPU_MEM_UTIL_MIN, value));
  return (Math.round(bounded * 100) / 100).toFixed(2);
}

/**
 * GET /orders/:id/deploy-plans?model_id=&gpu_mem_util=. Plans depend on gpu_mem_util, so the
 * value the buyer will submit is always sent. 50000 while fleet is disabled, 40900 when the lease
 * is not active, 40001 for a non-managed order: the backend message is shown unchanged.
 */
export function fetchDeployPlans(orderNo: string, modelId: number, gpuMemUtil = GPU_MEM_UTIL_DEFAULT, fetchImplementation?: typeof fetch) {
  const params = new URLSearchParams({model_id: String(modelId), gpu_mem_util: formatGpuMemUtil(gpuMemUtil)});
  return requestEnvelope(`${base(orderNo)}/deploy-plans?${params}`, deployPlansSchema, {fallback: "可行性判定失败", fetchImplementation});
}

/** 40001 carries `data.checks` with the failed items; callers read it via `deployErrorChecks`. */
export function createDeployment(orderNo: string, input: DeploymentInput, fetchImplementation?: typeof fetch) {
  return requestEnvelope(`${base(orderNo)}/deployments`, deploymentSchema, {
    fallback: "部署提交失败",
    init: jsonInit("POST", deploymentInput.parse(input)),
    fetchImplementation,
  });
}

export function fetchDeployments(orderNo: string, fetchImplementation?: typeof fetch) {
  return requestEnvelope(`${base(orderNo)}/deployments`, listPayload(deploymentSchema), {fallback: "部署记录读取失败", fetchImplementation});
}

export function fetchDeployment(orderNo: string, deployNo: string, fetchImplementation?: typeof fetch) {
  return requestEnvelope(`${base(orderNo)}/deployments/${encodeURIComponent(deployNo)}`, deploymentSchema, {fallback: "部署详情读取失败", fetchImplementation});
}

export function fetchDeploymentHealth(orderNo: string, deployNo: string, range: HealthRange, fetchImplementation?: typeof fetch) {
  return requestEnvelope(
    `${base(orderNo)}/deployments/${encodeURIComponent(deployNo)}/health?range=${range}`,
    healthSeriesSchema,
    {fallback: "健康采样读取失败", fetchImplementation},
  );
}

/** Rate limited to 6/min by the backend (42900); the message is shown as returned. */
export function fetchDeploymentLogs(orderNo: string, deployNo: string, fetchImplementation?: typeof fetch) {
  return requestEnvelope(`${base(orderNo)}/deployments/${encodeURIComponent(deployNo)}/logs?tail=200`, logsSchema, {fallback: "引擎日志读取失败", fetchImplementation});
}

export function changeDeploymentState(orderNo: string, deployNo: string, action: "stop" | "restart", fetchImplementation?: typeof fetch) {
  return requestEnvelope(`${base(orderNo)}/deployments/${encodeURIComponent(deployNo)}/${action}`, deploymentSchema, {
    fallback: action === "stop" ? "停止失败" : "重启失败",
    init: jsonInit("POST"),
    fetchImplementation,
  });
}

/** Pulls `data.checks` out of a 40001 deploy rejection; anything else yields []. */
export function deployErrorChecks(data: unknown): FeasibilityCheck[] {
  const parsed = z.object({checks: z.array(feasibilityCheckSchema)}).safeParse(data);
  return parsed.success ? parsed.data.checks : [];
}

/** 40001 "tp/dp 不在可行方案内" carries `data.plans` (deploy_service.go:131). */
export function deployErrorPlans(data: unknown): DeployPlan[] {
  const parsed = z.object({plans: z.array(deployPlanSchema)}).safeParse(data);
  return parsed.success ? parsed.data.plans : [];
}

/** 40900 "已有未终止的部署" carries `data.deploy_no` / `data.state` (deploy_service.go:112). */
export function deployConflict(data: unknown): {deploy_no: string; state: string} | null {
  const parsed = z.object({deploy_no: z.string().min(1), state: z.string()}).safeParse(data);
  return parsed.success ? parsed.data : null;
}

/** Restart on stopped/failed resumes the same deployment (deploy_control.go:81); 40900 while stopping. */
export function restartLabel(state: string) {
  if (state === "stopped" || state === "failed") return "恢复";
  return state === "running" ? "重启" : null;
}

/** GET /admin/deployments?state=&health=&page=&page_size= */
export function fetchAdminDeployments(
  filter: {state?: string; health?: string; page?: number; pageSize?: number},
  fetchImplementation?: typeof fetch,
) {
  const params = new URLSearchParams();
  if (filter.state) params.set("state", filter.state);
  if (filter.health) params.set("health", filter.health);
  params.set("page", String(filter.page ?? 1));
  params.set("page_size", String(filter.pageSize ?? 20));
  return requestEnvelope(`/api/admin/deployments?${params}`, pagedPayload(adminDeploymentSchema), {
    fallback: "部署列表读取失败",
    fetchImplementation,
  });
}

/** Weight-pull percentage from `cache`; null when the size is unknown. */
export function pullPercent(cache: Deployment["cache"]) {
  if (!cache || cache.weights_bytes <= 0) return null;
  return Math.min(100, (cache.bytes_done / cache.weights_bytes) * 100);
}

/**
 * Confirmations the backend will demand on submit (Result.MissingAcks): every `confirm` check
 * that did not pass carries `ack` = license_ack (F7) or untested_ack (F8).
 */
export function requiredAcks(checks: readonly FeasibilityCheck[]) {
  const pending = checks.filter((check) => !check.ok && check.level === "confirm");
  return {
    license: pending.some((check) => check.ack === "license_ack"),
    untested: pending.some((check) => check.ack === "untested_ack"),
  };
}

export function checkTone(check: FeasibilityCheck): "ok" | "warn" | "confirm" | "block" {
  if (check.ok || check.level === "info") return "ok";
  if (check.level === "error") return "block";
  return check.level === "confirm" ? "confirm" : "warn";
}

/** Backend checks say "无法判定" when an input could not be determined; such a check is not a hardware verdict. */
export function isUndeterminedCheck(check: FeasibilityCheck) {
  return !check.ok && check.message.includes("无法判定");
}

export function recommendedPlan(plans: readonly DeployPlan[]) {
  return plans.find((plan) => plan.recommended) ?? plans[0] ?? null;
}

/** States in which a deployment still holds the lease's single deployment slot. */
export function isLiveDeployment(state: string) {
  return !["stopped", "failed"].includes(state);
}

export function engineCommands(login: string, host: string, port: number) {
  const portFlag = port === 22 ? "" : `-p ${port} `;
  return {
    inLease: "curl http://omnis-engine:8000/v1/models",
    tunnel: `ssh ${portFlag}-N -L 8000:omnis-engine:8000 ${login}@${host}`,
    local: "curl http://127.0.0.1:8000/v1/models",
  };
}
