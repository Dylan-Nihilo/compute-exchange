import {z} from "zod";

// ===== 类型与文案 =====

export const productTypeCopy: Record<string, string> = {
  card_rental: "零租(按卡租)",
  outright: "零售买断",
  center: "成熟算力中心",
  colocation: "空心机房",
};

export const pricingModeCopy: Record<string, string> = {
  hourly: "按小时",
  daily: "按天",
  weekly: "按周",
  monthly: "按月",
  perpetual: "买断",
};

export const productStatusCopy: Record<string, string> = {
  draft: "草稿",
  pending: "待审核",
  active: "在售",
  sold_out: "售罄",
  offline: "已下架",
  frozen: "已冻结",
};

export const qualificationStatusCopy: Record<string, string> = {
  pending: "审核中",
  approved: "已通过",
  rejected: "已驳回",
};

export const settlementStatusCopy: Record<string, string> = {
  pending: "待结算",
  processing: "结算中",
  success: "已分账",
  failed: "结算失败",
};

// ===== Schemas =====

const qualificationSchema = z.object({
  id: z.number().int().positive(),
  user_id: z.number().int().positive(),
  qual_type: z.string(),
  cert_name: z.string(),
  cert_number: z.string(),
  cert_url: z.string(),
  expires_at: z.string().nullable(),
  status: z.string(),
  rejected_reason: z.string().optional(),
  created_at: z.string(),
}).transform((qualification) => ({
  ...qualification,
  status: qualification.status === "verified" ? "approved" : qualification.status,
}));

const productSchema = z.object({
  id: z.number().int().positive(),
  supplier_id: z.number().int().positive(),
  product_type: z.string(),
  gpu_model: z.string(),
  card_count: z.number().int().nonnegative(),
  machine_count: z.number().int().positive().nullable(),
  total_pflops_approx: z.string().nullable(),
  power_capacity_kw: z.number().int().positive().nullable(),
  rack_count: z.number().int().positive().nullable(),
  cpu_spec: z.string(),
  memory_spec: z.string(),
  storage_spec: z.string(),
  bandwidth_spec: z.string(),
  delivery_mode: z.string(),
  pricing_mode: z.string(),
  unit_price: z.number().int().nonnegative(),
  price_negotiable: z.boolean(),
  available_hours: z.string(),
  stock: z.number().int().nonnegative(),
  min_order: z.number().int().positive(),
  min_duration: z.number().int().positive(),
  region: z.string(),
  status: z.string(),
  self_operated: z.boolean(),
  rejected_reason: z.string().default(""),
});

const productGroupSchema = z.object({
  product_type: z.string(),
  label: z.string(),
  count: z.number().int().nonnegative(),
  total_machine: z.number().int().nonnegative(),
  total_card: z.number().int().nonnegative(),
  total_stock: z.number().int().nonnegative(),
  active_count: z.number().int().nonnegative(),
  products: z.array(productSchema).nullable(),
});

const supplierOrderSchema = z.object({
  id: z.number().int().positive(),
  order_no: z.string(),
  buyer_id: z.number().int().positive(),
  product_id: z.number().int().positive(),
  quantity: z.number().int().positive(),
  duration: z.number().int().positive(),
  unit_price: z.number().int().nonnegative(),
  total_amount: z.number().int().nonnegative(),
  platform_fee: z.number().int().nonnegative(),
  status: z.string(),
  payment_expires_at: z.string().nullable(),
  lease_start_at: z.string().nullable(),
  lease_end_at: z.string().nullable(),
  compliance_agreed: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  gpu_model: z.string().optional(),
  product_type: z.string().optional(),
  pricing_mode: z.string().optional(),
});

const settlementSchema = z.object({
  id: z.number().int().positive(),
  settlement_id: z.string(),
  order_no: z.string(),
  payee_type: z.string(),
  payee_id: z.number().int().nonnegative(),
  amount: z.number().int().nonnegative(),
  status: z.string(),
  created_at: z.string(),
});

const settlementSummarySchema = z.object({
  total_fen: z.number().int().nonnegative(),
  succeeded_fen: z.number().int().nonnegative(),
  pending_fen: z.number().int().nonnegative(),
});

const resourceSyncSchema = z.object({
  id: z.number().int().positive(),
  product_id: z.number().int().positive(),
  supplier_id: z.number().int().positive(),
  sync_type: z.string(),
  stock_before: z.number().int().nonnegative(),
  stock_after: z.number().int().nonnegative(),
  diff: z.number().int(),
  reason: z.string(),
  operator_id: z.number().int().nonnegative(),
  anomaly: z.boolean(),
  created_at: z.string(),
});

const listEnvelope = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    code: z.number().int(),
    message: z.string(),
    data: z.array(item).nullable().optional(),
  });

const groupListEnvelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z.array(productGroupSchema).nullable().optional(),
});

const pageEnvelope = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    code: z.number().int(),
    message: z.string(),
    data: z.object({
      list: z.array(item).nullable(),
      total: z.number().int().nonnegative(),
      page: z.number().int().positive(),
      page_size: z.number().int().positive(),
    }).optional(),
  });

const orderPageEnvelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z.object({
    list: z.array(supplierOrderSchema).nullable(),
    total: z.number().int().nonnegative(),
    status_counts: z.record(z.string(), z.number().int().nonnegative()),
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
  }).optional(),
});

const summaryEnvelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: settlementSummarySchema.optional(),
});

const actionEnvelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
});

const createProductEnvelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z.object({id: z.number().int()}).optional(),
});

const deliverEnvelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z.object({
    access_key: z.string(),
    access_value: z.string(),
    access_status: z.string(),
    access_expires_at: z.string().nullable(),
    masked: z.boolean(),
  }).optional(),
});

export type SupplierQualification = z.infer<typeof qualificationSchema>;
export type SupplierProduct = z.infer<typeof productSchema>;
export type SupplierProductGroup = z.infer<typeof productGroupSchema>;
export type SupplierOrder = z.infer<typeof supplierOrderSchema>;
export type SupplierSettlement = z.infer<typeof settlementSchema>;
export type SupplierSettlementSummary = z.infer<typeof settlementSummarySchema>;
export type SupplierResourceSync = z.infer<typeof resourceSyncSchema>;

export type CreateProductInput = {
  product_type: string;
  gpu_model?: string;
  card_count?: number;
  machine_count?: number;
  total_pflops_approx?: string;
  power_capacity_kw?: number;
  rack_count?: number;
  price_negotiable: boolean;
  cpu_spec?: string;
  memory_spec?: string;
  storage_spec?: string;
  bandwidth_spec?: string;
  delivery_mode?: string;
  pricing_mode: string;
  unit_price?: number;
  available_hours?: string;
  stock: number;
  min_order?: number;
  min_duration?: number;
  region: string;
  compliance_agreed: boolean;
};

export type SubmitQualificationInput = {
  qual_type: string;
  cert_name: string;
  cert_number: string;
  cert_url: string;
};

export type DeliverOrderInput = {
  ip_address: string;
  ssh_port: number;
  username: string;
  password: string;
  credential_note?: string;
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
    throw new Error("卖家工作台服务暂不可用");
  }
  const parsed = schema.safeParse(await response.json().catch(() => null));
  if (!parsed.success || !parsed.data) throw new Error("服务返回格式错误");
  if (!response.ok || parsed.data.code !== 0) {
    throw new Error(parsed.data.message || fallbackMessage);
  }
  return parsed.data;
}

// ===== API =====

export function fetchMyQualifications(fetchImplementation: typeof fetch = fetch) {
  return request("/api/supplier/qualifications", listEnvelope(qualificationSchema), "资质读取失败", undefined, fetchImplementation)
    .then((data) => data.data ?? []);
}

export function submitQualification(input: SubmitQualificationInput, fetchImplementation: typeof fetch = fetch) {
  return request(
    "/api/supplier/qualifications",
    actionEnvelopeSchema,
    "资质提交失败",
    {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(input)},
    fetchImplementation,
  );
}

export function fetchMyProducts(fetchImplementation: typeof fetch = fetch) {
  return request("/api/supplier/products", listEnvelope(productSchema), "商品列表读取失败", undefined, fetchImplementation)
    .then((data) => data.data ?? []);
}

export function fetchMyProductGroups(fetchImplementation: typeof fetch = fetch) {
  return request("/api/supplier/products/summary", groupListEnvelopeSchema, "商品汇总读取失败", undefined, fetchImplementation)
    .then((data) => data.data ?? []);
}

export function createProduct(input: CreateProductInput, fetchImplementation: typeof fetch = fetch) {
  return request(
    "/api/supplier/products",
    createProductEnvelopeSchema,
    "商品发布失败",
    {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(input)},
    fetchImplementation,
  );
}

export function resubmitProduct(id: number, input: CreateProductInput, fetchImplementation: typeof fetch = fetch) {
  return request(`/api/supplier/products/${id}`, createProductEnvelopeSchema, "商品重新提交失败",
    {method: "PUT", headers: {"content-type": "application/json"}, body: JSON.stringify(input)}, fetchImplementation);
}

export function fetchSupplierOrders(
  query: {status?: string; page?: number; pageSize?: number} = {},
  fetchImplementation: typeof fetch = fetch,
) {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("page_size", String(query.pageSize));
  const url = `/api/supplier/orders${params.size ? `?${params}` : ""}`;
  return request(url, orderPageEnvelopeSchema, "订单列表读取失败", undefined, fetchImplementation)
    .then((data) => ({
      orders: data.data?.list ?? [],
      total: data.data?.total ?? 0,
      statusCounts: data.data?.status_counts ?? {},
      page: data.data?.page ?? 1,
      pageSize: data.data?.page_size ?? 20,
    }));
}

export function deliverOrder(orderNo: string, input: DeliverOrderInput, fetchImplementation: typeof fetch = fetch) {
  return request(
    `/api/supplier/orders/${encodeURIComponent(orderNo)}/deliver`,
    deliverEnvelopeSchema,
    "交付提交失败",
    {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(input)},
    fetchImplementation,
  );
}

export function fetchSupplierSettlements(
  query: {status?: string; page?: number; pageSize?: number} = {},
  fetchImplementation: typeof fetch = fetch,
) {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("page_size", String(query.pageSize));
  const url = `/api/supplier/settlements${params.size ? `?${params}` : ""}`;
  return request(url, pageEnvelope(settlementSchema), "结算流水读取失败", undefined, fetchImplementation)
    .then((data) => ({
      settlements: data.data?.list ?? [],
      total: data.data?.total ?? 0,
      page: data.data?.page ?? 1,
      pageSize: data.data?.page_size ?? 20,
    }));
}

export function fetchSupplierSettlementSummary(fetchImplementation: typeof fetch = fetch) {
  return request("/api/supplier/settlements/summary", summaryEnvelopeSchema, "结算汇总读取失败", undefined, fetchImplementation)
    .then((data) => data.data ?? {total_fen: 0, succeeded_fen: 0, pending_fen: 0});
}

// ===== 资源盘点 (C-05) =====

export type SubmitResourceSyncInput = {
  product_id: number;
  stock_after: number;
  reason: string;
};

export function fetchResourceSyncs(
  query: {productId?: number; page?: number; pageSize?: number} = {},
  fetchImplementation: typeof fetch = fetch,
) {
  const params = new URLSearchParams();
  if (query.productId) params.set("product_id", String(query.productId));
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("page_size", String(query.pageSize));
  const url = `/api/supplier/resource-syncs${params.size ? `?${params}` : ""}`;
  return request(url, pageEnvelope(resourceSyncSchema), "盘点记录读取失败", undefined, fetchImplementation)
    .then((data) => ({
      syncs: data.data?.list ?? [],
      total: data.data?.total ?? 0,
      page: data.data?.page ?? 1,
      pageSize: data.data?.page_size ?? 20,
    }));
}

export function submitPassiveResourceSync(input: SubmitResourceSyncInput, fetchImplementation: typeof fetch = fetch) {
  return request(
    "/api/supplier/resource-syncs/passive",
    actionEnvelopeSchema,
    "盘点上报失败",
    {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(input)},
    fetchImplementation,
  );
}
