import {z} from "zod";

import {jsonInit, requestEnvelope} from "./api/envelope.ts";
import {pagedPayload} from "./admin-managed.ts";

// Operator model catalogue (docs/27 §27.2, §27.7 model_catalog, §27.8 运营).
// Only `draft` entries are editable; changing an `active` entry means creating a new one.

const BASE = "/api/admin/model-catalog";
const bigint = z.coerce.number().int().nonnegative();
const flag = z.union([z.boolean(), z.number()]).transform(Boolean);

export const catalogStatusCopy: Record<string, string> = {draft: "草稿", active: "已上线", retired: "已退役"};
export const commercialUseCopy: Record<string, string> = {allowed: "允许商用", restricted: "受限（需买家确认）", unknown: "未明确"};

export const verificationSchema = z.object({
  id: z.number().int().positive(),
  gpu_model: z.string(),
  cards: z.number().int().positive(),
  tp: z.number().int().positive(),
  max_model_len: z.number().int().positive(),
  measured_overhead_bytes: bigint.nullable().optional(),
  result: z.enum(["pass", "fail"]),
  notes: z.string().nullable().optional(),
  tested_at: z.string(),
});
export type CatalogVerification = z.infer<typeof verificationSchema>;

export const adminCatalogEntrySchema = z.object({
  id: z.number().int().positive(),
  model_key: z.string(),
  display_name: z.string(),
  source: z.string().optional(),
  repo: z.string(),
  revision: z.string(),
  manifest: z.unknown().optional(),
  weights_bytes: bigint,
  quant: z.string(),
  min_compute_capability: z.string(),
  valid_tp: z.string(),
  kv_bytes_per_token: bigint,
  kv_replicated_across_tp: flag,
  runtime_overhead_bytes: bigint,
  max_model_len: z.number().int().positive(),
  min_context_tokens: z.number().int().positive(),
  engine: z.string().optional(),
  engine_image: z.string(),
  min_driver_version: z.string(),
  engine_args: z.unknown().optional(),
  metrics_map: z.unknown().optional(),
  startup_timeout_s: z.number().int().positive(),
  license: z.string(),
  commercial_use: z.enum(["allowed", "restricted", "unknown"]),
  status: z.enum(["draft", "active", "retired"]),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  // Not documented as part of the list/detail payload; shown when the backend includes it.
  verifications: z.array(verificationSchema).nullable().optional(),
});
export type AdminCatalogEntry = z.infer<typeof adminCatalogEntrySchema>;

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

const manifestSchema = z.array(z.object({
  path: z.string().min(1),
  size: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/i, "sha256 应为 64 位十六进制"),
})).min(1, "清单至少一个文件");
const objectSchema = z.record(z.string(), z.unknown());

export const catalogEntryInput = z.object({
  model_key: z.string().trim().regex(/^[a-z0-9][a-z0-9._-]{0,63}$/, "model_key 仅限小写字母、数字、点、下划线与连字符，最长 64"),
  display_name: z.string().trim().min(1, "请填写显示名称").max(128),
  repo: z.string().trim().min(1, "请填写 ModelScope 仓库").max(255),
  revision: z.string().trim().regex(/^[0-9a-f]{7,64}$/i, "revision 必须是固定提交号（十六进制），不接受分支名"),
  manifest: jsonText(manifestSchema, "文件清单"),
  weights_bytes: z.number().int().positive("权重字节数须为正整数"),
  quant: z.string().trim().min(1, "请填写量化方式").max(16),
  min_compute_capability: z.string().trim().regex(/^\d{1,2}\.\d$/, "最低计算能力格式如 8.9"),
  valid_tp: z.string().trim().regex(/^\d+(,\d+)*$/, "允许的 TP 以逗号分隔，如 1,2,4,8"),
  kv_bytes_per_token: z.number().int().positive("每 token KV 字节数须为正整数"),
  kv_replicated_across_tp: z.boolean(),
  runtime_overhead_bytes: z.number().int().nonnegative(),
  max_model_len: z.number().int().positive(),
  min_context_tokens: z.number().int().positive(),
  engine_image: z.string().trim().regex(/^\S+@sha256:[0-9a-f]{64}$/, "引擎镜像须为 ref@sha256:<64 位摘要>"),
  min_driver_version: z.string().trim().min(1, "请填写最低驱动版本").max(32),
  engine_args: jsonText(objectSchema, "引擎参数模板"),
  metrics_map: jsonText(objectSchema, "指标名映射"),
  startup_timeout_s: z.number().int().positive(),
  license: z.string().trim().min(1, "请填写许可证").max(64),
  commercial_use: z.enum(["allowed", "restricted", "unknown"]),
}).refine((input) => input.min_context_tokens <= input.max_model_len, {message: "最低上下文不能大于模型上限", path: ["min_context_tokens"]});
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

/** No list filters are documented for GET /admin/model-catalog; status filtering is done client-side. */
export function fetchAdminCatalog(fetchImplementation?: typeof fetch) {
  return requestEnvelope(BASE, pagedPayload(adminCatalogEntrySchema), {fallback: "模型目录读取失败", fetchImplementation});
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
  return requestEnvelope(`${BASE}/${id}`, adminCatalogEntrySchema, {fallback: "模型条目读取失败", fetchImplementation});
}

export function saveCatalogEntry(id: number | null, input: CatalogEntryInput, fetchImplementation?: typeof fetch) {
  return requestEnvelope(id === null ? BASE : `${BASE}/${id}`, z.unknown(), {
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
  measured_overhead_bytes: z.number().int().nonnegative().nullable(),
  result: z.enum(["pass", "fail"]),
  notes: z.string().trim().max(512).nullable(),
  tested_at: z.string().min(1, "请填写测试时间"),
});
export type VerificationInput = z.infer<typeof verificationInput>;

export function addVerification(id: number, input: VerificationInput, fetchImplementation?: typeof fetch) {
  return requestEnvelope(`${BASE}/${id}/verifications`, z.unknown(), {
    fallback: "验证记录保存失败",
    init: jsonInit("POST", verificationInput.parse(input)),
    fetchImplementation,
  });
}

/** activate without a `pass` verification answers 40001; retiring does not stop running deployments. */
export function changeCatalogStatus(id: number, action: "activate" | "retire", fetchImplementation?: typeof fetch) {
  return requestEnvelope(`${BASE}/${id}/${action}`, z.unknown(), {
    fallback: action === "activate" ? "上线失败" : "退役失败",
    init: jsonInit("POST"),
    fetchImplementation,
  });
}
