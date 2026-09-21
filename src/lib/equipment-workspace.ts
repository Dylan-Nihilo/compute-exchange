import {z} from "zod";

import {equipmentWireSchema, mapEquipmentProduct, type EquipmentItem} from "./equipment-api.ts";

// 供给方设备商品工作台: 全部经 BFF(/api/vendor/equipments*)代理到后端 vendor 路由组。

const inquirySchema = z.object({
  id: z.number().int(),
  equipment_id: z.number().int(),
  buyer_id: z.number().int(),
  quantity: z.number().int(),
  contact_name: z.string(),
  contact_phone: z.string(),
  message: z.string(),
  status: z.string(),
  created_at: z.string(),
});

export type EquipmentInquiryRecord = z.infer<typeof inquirySchema>;

export const inquiryStatusCopy: Record<string, string> = {
  new: "待跟进",
  replied: "已回复",
  closed: "已关闭",
};

const pageEnvelope = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    code: z.number().int(),
    message: z.string(),
    data: z
      .object({
        list: z.array(item).nullable(),
        total: z.number().int().nonnegative(),
        page: z.number().int().positive(),
        page_size: z.number().int().positive(),
      })
      .optional(),
  });

const actionEnvelope = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z.unknown().optional(),
});

const createEnvelope = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z.object({id: z.number().int().positive(), status: z.string()}).optional(),
});

export type CreateEquipmentInput = {
  title: string;
  equipment_type: string;
  brand?: string;
  model?: string;
  condition_type: "new" | "used";
  manufacture_year?: number;
  usage_desc?: string;
  quantity: number;
  /** 单位: 分; 面议时必须为 0 */
  unit_price: number;
  price_negotiable: boolean;
  region: string;
  description?: string;
};

async function request<T extends {code: number; message: string}>(
  url: string,
  schema: {safeParse: (v: unknown) => {success: boolean; data?: T}},
  fallbackMessage: string,
  init?: RequestInit,
  fetchImplementation: typeof fetch = fetch,
): Promise<T> {
  let response: Response;
  try {
    response = await fetchImplementation(url, init);
  } catch {
    throw new Error("设备商品服务暂不可用");
  }
  const parsed = schema.safeParse(await response.json().catch(() => null));
  if (!parsed.success || !parsed.data) throw new Error("服务返回格式错误");
  if (!response.ok || parsed.data.code !== 0) {
    throw new Error(parsed.data.message || fallbackMessage);
  }
  return parsed.data;
}

export async function fetchMyEquipments(
  query: {status?: string; page?: number; pageSize?: number} = {},
  fetchImplementation: typeof fetch = fetch,
): Promise<{items: EquipmentItem[]; total: number}> {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    page_size: String(query.pageSize ?? 50),
  });
  if (query.status) params.set("status", query.status);
  const data = await request(
    `/api/vendor/equipments?${params.toString()}`,
    pageEnvelope(equipmentWireSchema),
    "设备商品列表读取失败",
    undefined,
    fetchImplementation,
  );
  return {
    items: (data.data?.list ?? []).map(mapEquipmentProduct),
    total: data.data?.total ?? 0,
  };
}

export function createEquipmentProduct(
  input: CreateEquipmentInput,
  fetchImplementation: typeof fetch = fetch,
) {
  return request(
    "/api/vendor/equipments",
    createEnvelope,
    "设备商品发布失败",
    {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(input)},
    fetchImplementation,
  ).then((data) => {
    if (!data.data) throw new Error("设备商品发布失败");
    return data.data;
  });
}

// 修改重提: 仅 draft(草稿/被驳回)可改, 重提后回 pending 重新审核并清空驳回原因。
export function updateEquipmentProduct(
  id: string,
  input: CreateEquipmentInput,
  fetchImplementation: typeof fetch = fetch,
) {
  return request(
    `/api/vendor/equipments/${encodeURIComponent(id)}`,
    createEnvelope,
    "设备商品重新提交失败",
    {method: "PUT", headers: {"content-type": "application/json"}, body: JSON.stringify(input)},
    fetchImplementation,
  ).then((data) => {
    if (!data.data) throw new Error("设备商品重新提交失败");
    return data.data;
  });
}

export function offlineEquipmentProduct(id: string, fetchImplementation: typeof fetch = fetch) {
  return request(
    `/api/vendor/equipments/${encodeURIComponent(id)}/offline`,
    actionEnvelope,
    "商品下架失败",
    {method: "PATCH"},
    fetchImplementation,
  );
}

export async function fetchVendorEquipmentInquiries(
  query: {status?: string; page?: number; pageSize?: number} = {},
  fetchImplementation: typeof fetch = fetch,
): Promise<{items: EquipmentInquiryRecord[]; total: number}> {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    page_size: String(query.pageSize ?? 50),
  });
  if (query.status) params.set("status", query.status);
  const data = await request(
    `/api/vendor/equipments/inquiries?${params.toString()}`,
    pageEnvelope(inquirySchema),
    "询价列表读取失败",
    undefined,
    fetchImplementation,
  );
  return {items: data.data?.list ?? [], total: data.data?.total ?? 0};
}
