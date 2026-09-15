import {z} from "zod";
import {createApiClient} from "./api/client.ts";
import {gpuCatalogItemSchema} from "./gpu-catalog.ts";

const itemSchema = gpuCatalogItemSchema.extend({spec_source: z.string().nullable().optional(), updated_at: z.string()});
const inputSchema = gpuCatalogItemSchema.omit({id: true}).extend({
  vendor: z.string().trim().min(1).max(32),
  model_name: z.string().trim().min(1).max(64),
  vram_gb: z.number().int().positive().max(2147483647).nullable(),
  vram_type: z.string().max(16).nullable(),
  fp16_tflops: z.number().positive().max(9999999.9).nullable(),
  interconnect: z.string().max(32).nullable(),
  spec_source: z.string().max(255).nullable(),
  sort_weight: z.number().int().min(-2147483648).max(2147483647),
});
const listSchema = z.object({code: z.number().int(), message: z.string(), data: z.object({list: z.array(itemSchema).nullable(), total: z.number().int().nonnegative()}).optional()});
const actionSchema = z.object({code: z.number().int(), message: z.string()});

export type AdminGpuModel = z.infer<typeof itemSchema>;
export type GpuModelInput = z.infer<typeof inputSchema>;
export type GpuCatalogFilter = {q?: string; vendor?: string; origin?: string; grade?: string};

export function gpuModelFromForm(form: FormData): GpuModelInput {
  const text = (name: string) => String(form.get(name) ?? "").trim();
  const number = (name: string) => text(name) === "" ? null : Number(text(name));
  return inputSchema.parse({
    vendor: text("vendor"), model_name: text("model_name"), origin: text("origin"), grade: text("grade"),
    vram_gb: number("vram_gb"), vram_type: text("vram_type") || null, fp16_tflops: number("fp16_tflops"),
    interconnect: text("interconnect") || null, spec_source: text("spec_source") || null,
    secure_certified: form.has("secure_certified"), status: form.has("enabled") ? "enabled" : "disabled", sort_weight: Number(text("sort_weight") || "0"),
  });
}

export async function fetchAdminGpuCatalog(filter: GpuCatalogFilter = {}, fetchImplementation: typeof fetch = fetch, signal?: AbortSignal) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) if (value?.trim()) params.set(key, value.trim());
  const api = createApiClient({baseUrl: "/api/admin", fetchImplementation});
  const payload = await api.request(`/gpu-catalog${params.size ? `?${params}` : ""}`, listSchema, {cache: "no-store", signal});
  if (payload.code !== 0) throw new Error(payload.message || "型号库读取失败");
  if (!payload.data) throw new Error("型号库返回格式错误");
  return {items: payload.data.list ?? [], total: payload.data.total};
}

export async function saveAdminGpuModel(id: number | null, input: GpuModelInput, fetchImplementation: typeof fetch = fetch) {
  const parsed = inputSchema.parse(input);
  const api = createApiClient({baseUrl: "/api/admin", fetchImplementation});
  const {status, ...createInput} = parsed;
  const payload = await api.request(id === null ? "/gpu-catalog" : `/gpu-catalog/${id}`, actionSchema, {
    method: id === null ? "POST" : "PUT", json: id === null ? createInput : {...createInput, status},
  });
  if (payload.code !== 0) throw new Error(payload.message || "型号保存失败");
}
