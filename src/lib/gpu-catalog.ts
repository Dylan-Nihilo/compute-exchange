import {z} from "zod";

import {createApiClient} from "./api/client.ts";

export const gpuCatalogItemSchema = z.object({
  id: z.number().int().positive(),
  vendor: z.string().min(1),
  model_name: z.string().min(1),
  origin: z.enum(["domestic", "international"]),
  grade: z.enum(["datacenter", "consumer"]),
  vram_gb: z.number().int().positive().nullable(),
  vram_type: z.string().nullable(),
  fp16_tflops: z.number().positive().nullable(),
  interconnect: z.string().nullable(),
  secure_certified: z.boolean(),
  status: z.enum(["enabled", "disabled"]),
  sort_weight: z.number().int(),
});

const gpuCatalogResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.object({
    list: z.array(gpuCatalogItemSchema).nullable(),
    total: z.number().int().nonnegative(),
  }).optional(),
});

export type GpuCatalogItem = z.infer<typeof gpuCatalogItemSchema>;

export function gpuModelFilterOptions(items: readonly Pick<GpuCatalogItem, "model_name">[], current = "") {
  const names = new Set(items.map((item) => item.model_name));
  if (current) names.add(current);
  return Array.from(names, (name) => ({label: name, value: name}));
}

export async function fetchGpuCatalog(fetchImplementation: typeof fetch = fetch, signal?: AbortSignal) {
  // 型号库读接口已收口到登录后, 经鉴权 BFF(/api/market-proxy)代理; 消费方(市场筛选/发布表单)均在登录场景。
  const api = createApiClient({baseUrl: "/api/market-proxy", fetchImplementation});
  const payload = await api.request("/gpu-catalog", gpuCatalogResponseSchema, {cache: "no-store", signal});
  if (payload.code !== 0) throw new Error(payload.message || "型号库暂不可用");
  if (!payload.data) throw new Error("型号库返回格式错误");
  return payload.data.list ?? [];
}

export const gpuVendorIcons: Record<string, string> = {
  NVIDIA: "/brand/vendors/nvidia.svg",
  AMD: "/brand/vendors/amd.svg",
  "华为昇腾": "/brand/vendors/ascend.svg",
  "海光": "/brand/vendors/hygon.png",
  "沐曦": "/brand/vendors/metax.svg",
  "摩尔线程": "/brand/vendors/mthreads.png",
  "壁仞": "/brand/vendors/biren.svg",
  "天数智芯": "/brand/vendors/iluvatar.png",
  "平头哥": "/brand/vendors/thead.png",
  "寒武纪": "/brand/vendors/cambricon.png",
  "昆仑芯": "/brand/vendors/kunlunxin.png",
  "燧原": "/brand/vendors/enflame.svg",
};
