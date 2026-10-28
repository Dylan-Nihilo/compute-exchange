import {z} from "zod";

import {jsonInit, requestEnvelope} from "./api/envelope.ts";

// Operator model catalogue (docs/27 §27.2, §27.7 model_catalog, §27.8 运营; modeldeploy handler/validate.go).
// Only `draft` entries are editable; changing an `active` entry means creating a new one.

const BASE = "/api/admin/model-catalog";
const count = z.number().int().nonnegative();

export const catalogStatuses = ["draft", "active", "retired"] as const;
export const catalogStatusCopy: Record<(typeof catalogStatuses)[number], string> = {draft: "草稿", active: "已上线", retired: "已退役"};
export const commercialUseCopy: Record<string, string> = {allowed: "允许商用", restricted: "受限（需买家确认）", unknown: "未明确"};

/** modeldeploy validQuant whitelist; free text is rejected by the backend. */
export const catalogQuants = ["bf16", "fp16", "fp8", "int8", "int4_awq", "int4_gptq", "mxfp4", "nvfp4"] as const;

/** modeldeploy EngineArgWhitelist (vLLM flags without "--"); platform-controlled flags are never allowed. */
export const engineArgWhitelist = [
  "dtype", "quantization", "kv-cache-dtype", "enable-prefix-caching", "enable-chunked-prefill", "max-num-seqs",
  "max-num-batched-tokens", "block-size", "enforce-eager", "tokenizer-mode", "reasoning-parser", "tool-call-parser",
  "enable-auto-tool-choice", "enable-expert-parallel", "swap-space", "disable-custom-all-reduce",
] as const;

/** modeldeploy MetricsMapKeys: every key is required, no others are accepted. */
export const metricsMapKeys = [
  "requests_running", "requests_waiting", "kv_cache_usage", "ttft_seconds",
  "generation_tokens_total", "prompt_tokens_total", "preemptions_total",
] as const;

/** modeldeploy.Verification. */
export const verificationSchema = z.object({
  id: z.number().int().positive(),
  model_id: z.number().int().positive(),
  gpu_model: z.string(),
  cards: z.number().int().positive(),
  tp: z.number().int().positive(),
  max_model_len: z.number().int().positive(),
  measured_overhead_bytes: z.number().int().positive().nullable(),
  result: z.enum(["pass", "fail"]),
  notes: z.string().nullable(),
  tested_by: z.number().int(),
  tested_at: z.string(),
});
export type CatalogVerification = z.infer<typeof verificationSchema>;

/** modeldeploy.ModelEntry (Go JSON: int64 as numbers, bool as booleans, JSON columns inline). */
export const adminCatalogEntrySchema = z.object({
  id: z.number().int().positive(),
  model_key: z.string(),
  display_name: z.string(),
  source: z.string(),
  repo: z.string(),
  revision: z.string(),
  manifest: z.unknown(),
  weights_bytes: count,
  quant: z.string(),
  min_compute_capability: z.string(),
  // Stored and returned as the normalised "1,2,4,8" string on admin endpoints (PublicModel uses int[]).
  valid_tp: z.string(),
  kv_bytes_per_token: count,
  kv_replicated_across_tp: z.boolean(),
  runtime_overhead_bytes: count,
  max_model_len: z.number().int().positive(),
  min_context_tokens: z.number().int().positive(),
  engine: z.string(),
  engine_image: z.string(),
  min_driver_version: z.string(),
  engine_args: z.unknown(),
  metrics_map: z.unknown(),
  startup_timeout_s: z.number().int().positive(),
  license: z.string(),
  commercial_use: z.enum(["allowed", "restricted", "unknown"]),
  status: z.enum(catalogStatuses),
  created_by: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type AdminCatalogEntry = z.infer<typeof adminCatalogEntrySchema>;

/** GET /admin/model-catalog/:id returns EntryDetail: the entry plus all verification records. */
export const adminCatalogDetailSchema = adminCatalogEntrySchema.extend({
  verifications: z.array(verificationSchema).nullable().transform((value) => value ?? []),
});
export type AdminCatalogDetail = z.infer<typeof adminCatalogDetailSchema>;

const jsonText = <T extends z.ZodType>(schema: T, label: string) =>
  z.string().transform((value, context): z.infer<T> => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      context.addIssue({code: "custom", message: `${label}不是合法 JSON`});
      return z.NEVER;
    }
    const result = schema.safeParse(parsed);
    if (!result.success) {
      context.addIssue({code: "custom", message: `${label}格式不符：${result.error.issues[0]?.message ?? ""}`});
      return z.NEVER;
    }
    return result.data;
  });

const TIB = 2 ** 40;
const manifestPath = z.string().refine(
  (path) => path.length > 0 && path.length <= 255 && !path.startsWith("/") && !path.includes("\\")
    && path.split("/").every((segment) => segment !== "" && segment !== "." && segment !== ".."),
  "路径须为相对路径，不得包含 .. 或以 / 开头",
);
const manifestSchema = z.array(z.object({
  path: manifestPath,
  size: z.number().int().positive().max(TIB, "单文件不超过 1 TiB"),
  sha256: z.string().regex(/^[0-9a-f]{64}$/, "sha256 应为 64 位小写十六进制"),
}).strict())
  .min(1, "清单至少一个文件")
  .max(10_000, "清单文件数不超过 10000")
  .refine((files) => new Set(files.map((file) => file.path)).size === files.length, "清单路径重复");

const argValuePattern = /^[A-Za-z0-9._:/=+][A-Za-z0-9._:/=+-]{0,127}$/;
const engineArgsSchema = z.record(z.string(), z.unknown()).superRefine((args, context) => {
  for (const [key, value] of Object.entries(args)) {
    if (!(engineArgWhitelist as readonly string[]).includes(key)) {
      context.addIssue({code: "custom", message: `不允许参数 ${key}（白名单外，或由平台按部署选择决定）`});
    } else if (typeof value === "number" ? value < 0 : typeof value === "string" ? !argValuePattern.test(value) : typeof value !== "boolean") {
      context.addIssue({code: "custom", message: `${key} 的值须为非负数、布尔值或安全字符组成的字符串（不以 - 开头）`});
    }
  }
});
const promNamePattern = /^[a-zA-Z_:][a-zA-Z0-9_:]{0,127}$/;
const metricsMapSchema = z.record(z.string(), z.string()).superRefine((map, context) => {
  for (const key of metricsMapKeys) {
    if (!promNamePattern.test(map[key] ?? "")) context.addIssue({code: "custom", message: `缺少或非法：${key}`});
  }
  for (const key of Object.keys(map)) {
    if (!(metricsMapKeys as readonly string[]).includes(key)) context.addIssue({code: "custom", message: `不支持的逻辑名：${key}`});
  }
});

/** Normalises "1, 2,4" like modeldeploy ParseValidTP: integers 1–64, no duplicates, ascending. */
const validTp = z.string().transform((value, context) => {
  const parts = value.split(",").map((part) => part.trim());
  const numbers = parts.map(Number);
  if (parts.some((part) => !/^\d+$/.test(part)) || numbers.some((n) => n < 1 || n > 64)) {
    context.addIssue({code: "custom", message: "允许的 TP 须为 1–64 的整数列表，如 1,2,4,8"});
    return z.NEVER;
  }
  if (new Set(numbers).size !== numbers.length) {
    context.addIssue({code: "custom", message: "允许的 TP 存在重复值"});
    return z.NEVER;
  }
  return [...numbers].sort((x, y) => x - y).join(",");
});

/** Mirrors modeldeploy normalizeEntry (validate.go); the backend's 40001 message still wins on submit. */
export const catalogEntryInput = z.object({
  model_key: z.string().trim().regex(/^[a-z0-9][a-z0-9._-]{1,63}$/, "model_key 须为 2–64 位小写字母、数字、点、下划线或连字符"),
  display_name: z.string().trim().min(1, "请填写显示名称").refine((value) => [...value].length <= 128, "显示名称不超过 128 字"),
  repo: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,126}\/[A-Za-z0-9][A-Za-z0-9._-]{0,126}$/, "仓库须为 组织/模型 格式"),
  revision: z.string().trim().regex(/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/, "revision 须为完整的固定提交号（40 或 64 位小写十六进制），不接受分支名或标签"),
  manifest: jsonText(manifestSchema, "文件清单"),
  weights_bytes: z.number().int().positive("权重字节数须为正整数").max(4 * TIB, "权重不超过 4 TiB"),
  quant: z.enum(catalogQuants, {message: "量化方式须为 bf16/fp16/fp8/int8/int4_awq/int4_gptq/mxfp4/nvfp4 之一"}),
  min_compute_capability: z.string().trim().regex(/^\d{1,2}\.\d$/, "最低计算能力格式如 8.0 / 8.9 / 9.0"),
  valid_tp: validTp,
  kv_bytes_per_token: z.number().int().positive("每 token KV 字节数须为正整数").max(64 * 2 ** 20, "每 token KV 不超过 64 MiB"),
  kv_replicated_across_tp: z.boolean(),
  runtime_overhead_bytes: z.number().int().positive("运行时开销须为正整数（取真机实测值）").max(256 * 2 ** 30, "运行时开销不超过 256 GiB"),
  max_model_len: z.number().int().positive().max(2 ** 24, "上下文上限不超过 16,777,216"),
  min_context_tokens: z.number().int().min(1024, "最低上下文须为 1024 的正整数倍").multipleOf(1024, "最低上下文须为 1024 的正整数倍"),
  engine_image: z.string().trim().regex(/^[a-z0-9][a-z0-9._/:-]{0,180}@sha256:[0-9a-f]{64}$/, "引擎镜像须为 镜像引用@sha256:<64 位摘要>"),
  min_driver_version: z.string().trim().regex(/^\d{1,4}(?:\.\d{1,4}){0,2}$/, "最低驱动版本须为点分数字，如 535.104.05"),
  engine_args: jsonText(engineArgsSchema, "引擎参数模板"),
  metrics_map: jsonText(metricsMapSchema, "指标名映射"),
  startup_timeout_s: z.number().int().min(60, "启动超时须在 60–7200 秒之间").max(7200, "启动超时须在 60–7200 秒之间"),
  license: z.string().trim().min(1, "请填写许可证").max(64, "许可证不超过 64 字符"),
  commercial_use: z.enum(["allowed", "restricted", "unknown"]),
})
  .refine((input) => input.min_context_tokens <= input.max_model_len, {message: "最低上下文不能大于模型上限", path: ["min_context_tokens"]})
  .refine((input) => !Array.isArray(input.manifest) || input.weights_bytes <= input.manifest.reduce((sum, file) => sum + file.size, 0), {
    message: "权重字节数不得超过清单文件总大小",
    path: ["weights_bytes"],
  });
export type CatalogEntryInput = z.infer<typeof catalogEntryInput>;

const JSON_FIELDS = ["manifest", "engine_args", "metrics_map"] as const;
const NUMBER_FIELDS = ["weights_bytes", "kv_bytes_per_token", "runtime_overhead_bytes", "max_model_len", "min_context_tokens", "startup_timeout_s"] as const;

/** Builds and validates a catalogue entry from the operator form. */
export function catalogEntryFromForm(form: FormData) {
  const text = (name: string) => String(form.get(name) ?? "").trim();
  const raw: Record<string, unknown> = {
    model_key: text("model_key"), display_name: text("display_name"), repo: text("repo"), revision: text("revision"),
    quant: text("quant"), min_compute_capability: text("min_compute_capability"), valid_tp: text("valid_tp").replace(/\s+/g, ""),
    kv_replicated_across_tp: form.has("kv_replicated_across_tp"), engine_image: text("engine_image"),
    min_driver_version: text("min_driver_version"), license: text("license"), commercial_use: text("commercial_use"),
  };
  for (const key of JSON_FIELDS) raw[key] = text(key);
  for (const key of NUMBER_FIELDS) raw[key] = text(key) === "" ? Number.NaN : Number(text(key));
  return catalogEntryInput.safeParse(raw);
}

/** Pretty-prints a JSON column for editing; strings already holding JSON are passed through. */
export function jsonForEdit(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

/** GET /admin/model-catalog?status= returns `{list,total}` (not paged); status filtering is done client-side. */
export function fetchAdminCatalog(fetchImplementation?: typeof fetch) {
  return requestEnvelope(
    BASE,
    z.object({list: z.array(adminCatalogEntrySchema).nullable().transform((value) => value ?? []), total: z.number().int().nonnegative()}),
    {fallback: "模型目录读取失败", fetchImplementation},
  );
}

/** datetime-local value (local wall clock) → RFC 3339 UTC; empty/invalid → "". */
export function localDateTimeToIso(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

/** Parses the verification form; `tested_at` comes from a datetime-local input. */
export function verificationFromForm(form: FormData) {
  const text = (name: string) => String(form.get(name) ?? "").trim();
  const int = (name: string) => (text(name) === "" ? Number.NaN : Number(text(name)));
  return verificationInput.safeParse({
    gpu_model: text("gpu_model"),
    cards: int("cards"),
    tp: int("tp"),
    max_model_len: int("max_model_len"),
    measured_overhead_bytes: text("measured_overhead_bytes") === "" ? null : int("measured_overhead_bytes"),
    result: text("result"),
    notes: text("notes") || null,
    tested_at: localDateTimeToIso(text("tested_at")),
  });
}

export function fetchAdminCatalogEntry(id: number, fetchImplementation?: typeof fetch) {
  return requestEnvelope(`${BASE}/${id}`, adminCatalogDetailSchema, {fallback: "模型条目读取失败", fetchImplementation});
}

export function saveCatalogEntry(id: number | null, input: CatalogEntryInput, fetchImplementation?: typeof fetch) {
  return requestEnvelope(id === null ? BASE : `${BASE}/${id}`, adminCatalogEntrySchema, {
    fallback: "模型条目保存失败",
    init: jsonInit(id === null ? "POST" : "PUT", input),
    fetchImplementation,
  });
}

export const verificationInput = z.object({
  gpu_model: z.string().trim().min(1, "请填写卡型").max(64),
  cards: z.number().int().positive("卡数须为正整数"),
  tp: z.number().int().positive("TP 须为正整数"),
  max_model_len: z.number().int().positive("上下文须为正整数"),
  measured_overhead_bytes: z.number().int().positive("实测开销须为正数").nullable(),
  result: z.enum(["pass", "fail"]),
  notes: z.string().trim().refine((value) => [...value].length <= 512, "备注不超过 512 字").nullable(),
  tested_at: z.string().min(1, "请填写测试时间").refine((value) => !(Date.parse(value) > Date.now()), "测试时间不能晚于当前时间"),
}).refine((input) => input.tp <= input.cards, {message: "TP 不能大于卡数", path: ["tp"]});
export type VerificationInput = z.infer<typeof verificationInput>;

export function addVerification(id: number, input: VerificationInput, fetchImplementation?: typeof fetch) {
  return requestEnvelope(`${BASE}/${id}/verifications`, verificationSchema, {
    fallback: "验证记录保存失败",
    init: jsonInit("POST", verificationInput.parse(input)),
    fetchImplementation,
  });
}

/** activate without a `pass` verification answers 40001; retiring does not stop running deployments. */
export function changeCatalogStatus(id: number, action: "activate" | "retire", fetchImplementation?: typeof fetch) {
  return requestEnvelope(`${BASE}/${id}/${action}`, adminCatalogEntrySchema, {
    fallback: action === "activate" ? "上线失败" : "退役失败",
    init: jsonInit("POST"),
    fetchImplementation,
  });
}
