import {z} from "zod";

import {jsonInit, listPayload, requestEnvelope} from "./api/envelope.ts";

// One-click model deployment on a managed lease (docs/27 §27.8 buyer).

/** DECIMAL columns may arrive as strings; null/absent stays null. */
const decimal = z.preprocess(
  (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : value),
  z.number().finite().nullable().optional(),
).transform((value) => value ?? null);

/** TINYINT / boolean flags. */
const flag = z.union([z.boolean(), z.number()]).nullable().optional().transform((value) => (value == null ? null : Boolean(value)));

export const catalogModelSchema = z.object({
  id: z.number().int().positive(),
  model_key: z.string(),
  display_name: z.string(),
  quant: z.string().optional(),
  weights_bytes: z.number().nonnegative().optional(),
  max_model_len: z.number().int().positive().optional(),
  license: z.string().optional(),
  commercial_use: z.enum(["allowed", "restricted", "unknown"]).optional(),
  // "含已验证卡型" — field name not pinned down in docs/27; accepted when present.
  verified_gpu_models: z.array(z.string()).optional(),
});
export type CatalogModel = z.infer<typeof catalogModelSchema>;

export const deployPlanSchema = z.object({
  tp: z.number().int().positive(),
  dp: z.number().int().positive(),
  cards_used: z.number().int().positive(),
  max_model_len: z.number().int().positive(),
  recommended: z.boolean().optional().default(false),
});
export type DeployPlan = z.infer<typeof deployPlanSchema>;

export const feasibilityCheckSchema = z.object({
  id: z.string(),
  ok: z.boolean().nullable().optional(),
  level: z.string().optional(),
  message: z.string().optional().default(""),
});
export type FeasibilityCheck = z.infer<typeof feasibilityCheckSchema>;

export const deployPlansSchema = z.object({
  feasible: z.boolean(),
  plans: z.array(deployPlanSchema).nullable().transform((value) => value ?? []),
  checks: z.array(feasibilityCheckSchema).nullable().transform((value) => value ?? []),
});
export type DeployPlans = z.infer<typeof deployPlansSchema>;

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

export const deploymentSchema = z.object({
  deploy_no: z.string().min(1),
  model_id: z.number().int().positive().optional(),
  model_key: z.string().optional(),
  display_name: z.string().optional(),
  tp: z.number().int().positive(),
  dp: z.number().int().positive(),
  max_model_len: z.number().int().positive(),
  gpu_mem_util: decimal,
  state: z.string(),
  health: z.string().optional().default("unknown"),
  health_reason: z.string().nullable().optional(),
  // Human-readable reason text; docs/27 §27.5.2 pairs a code with a Chinese explanation.
  health_message: z.string().nullable().optional(),
  canary_enabled: flag,
  restart_count: z.number().int().nonnegative().optional(),
  last_restart_at: z.string().nullable().optional(),
  fail_reason: z.string().nullable().optional(),
  log_tail: z.string().nullable().optional(),
  started_at: z.string().nullable().optional(),
  stopped_at: z.string().nullable().optional(),
  created_at: z.string().optional(),
  // Detail-only fields; shapes are not pinned down in docs/27 §27.8.
  access: z.unknown().optional(),
  pull_progress: z.object({bytes_done: z.number().nonnegative(), bytes_total: z.number().positive().optional()}).nullable().optional(),
});
export type Deployment = z.infer<typeof deploymentSchema>;

export const healthSampleSchema = z.object({
  sampled_at: z.string(),
  health: z.string().optional(),
  container_up: flag,
  canary_ok: flag,
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
  throttled: flag,
});
export type HealthSample = z.infer<typeof healthSampleSchema>;
export const healthRanges = ["1h", "24h", "7d"] as const;
export type HealthRange = (typeof healthRanges)[number];

/** Logs response shape is not pinned down; accept `{lines}`, `{log}`/`{content}` or a plain string. */
const logsSchema = z
  .union([
    z.string(),
    z.array(z.string()),
    z.object({lines: z.array(z.string())}),
    z.object({log: z.string()}),
    z.object({content: z.string()}),
  ])
  .transform((value) => {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.join("\n");
    if ("lines" in value) return value.lines.join("\n");
    return "log" in value ? value.log : value.content;
  });

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

export function fetchDeployPlans(orderNo: string, modelId: number, fetchImplementation?: typeof fetch) {
  return requestEnvelope(`${base(orderNo)}/deploy-plans?model_id=${modelId}`, deployPlansSchema, {fallback: "可行性判定失败", fetchImplementation});
}

/** 40001 carries `data.checks` with the failed items; callers read it via `deployErrorChecks`. */
export function createDeployment(orderNo: string, input: DeploymentInput, fetchImplementation?: typeof fetch) {
  return requestEnvelope(`${base(orderNo)}/deployments`, z.unknown(), {
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
    listPayload(healthSampleSchema),
    {fallback: "健康采样读取失败", fetchImplementation},
  );
}

/** Rate limited to 6/min by the backend (42900); the message is shown as returned. */
export function fetchDeploymentLogs(orderNo: string, deployNo: string, fetchImplementation?: typeof fetch) {
  return requestEnvelope(`${base(orderNo)}/deployments/${encodeURIComponent(deployNo)}/logs?tail=200`, logsSchema, {fallback: "引擎日志读取失败", fetchImplementation});
}

export function changeDeploymentState(orderNo: string, deployNo: string, action: "stop" | "restart", fetchImplementation?: typeof fetch) {
  return requestEnvelope(`${base(orderNo)}/deployments/${encodeURIComponent(deployNo)}/${action}`, z.unknown(), {
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

const ACK_LEVELS = new Set(["ack", "confirm", "warn", "warning"]);

function needsAck(checks: readonly FeasibilityCheck[], id: "F7" | "F8") {
  return checks.some((check) => check.id.toUpperCase() === id && (check.ok === false || ACK_LEVELS.has((check.level ?? "").toLowerCase())));
}

/**
 * F7 (restricted licence) and F8 (card model not verified) are feasible but must be
 * acknowledged separately (`license_ack` / `untested_ack`). The check encoding is not
 * pinned down, so a check counts when it fails or carries a warning/confirm level; a
 * `restricted` catalogue entry always requires the licence acknowledgement.
 */
export function requiredAcks(checks: readonly FeasibilityCheck[], model?: Pick<CatalogModel, "commercial_use">) {
  return {
    license: needsAck(checks, "F7") || model?.commercial_use === "restricted",
    untested: needsAck(checks, "F8"),
  };
}

export function checkTone(check: FeasibilityCheck): "ok" | "warn" | "block" {
  const level = (check.level ?? "").toLowerCase();
  if (level === "error" || level === "block" || level === "fatal") return "block";
  if (check.ok === false && !["F5", "F7", "F8"].includes(check.id.toUpperCase())) return "block";
  if (check.ok === false || ACK_LEVELS.has(level)) return "warn";
  return "ok";
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
