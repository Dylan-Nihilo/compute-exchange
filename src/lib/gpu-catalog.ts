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

export async function fetchGpuCatalog(fetchImplementation: typeof fetch = fetch, signal?: AbortSignal) {
  const api = createApiClient({baseUrl: "/api/v1", fetchImplementation});
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
