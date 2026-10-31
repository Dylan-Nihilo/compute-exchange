import {BackendRequestError} from "./api/envelope.ts";
import {buyerOrderStatuses, currentLeaseSchema} from "./buyer-orders.ts";
import {fulfillmentModeSchema} from "./domain/contracts.ts";
import {productPriceSchema} from "./flexible-pricing.ts";
import {LEGAL_VERSION} from "./legal.ts";
import {z} from "zod";

export function isSupplierOrderStatusFilter(status: string) {
  return !status || status.split(",").every((part) => buyerOrderStatuses.some((value) => value === part));
}

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
  nightly: "包夜",
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
  expiring: "即将到期",
  expired: "已过期",
  superseded: "已更新",
  rejected: "已驳回",
};

export const settlementStatusCopy: Record<string, string> = {
  pending: "待结算",
  processing: "结算中",
  success: "已分账",
  failed: "结算失败",
  cancelled: "已取消",
  reversed: "已退回",
};

export const paymentAccountStatusCopy: Record<string, string> = {
  not_started: "未开通",
  pending: "开通中",
  completed: "已开通",
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
  expires_in_days: z.number().int().nullable().optional(),
  superseded: z.boolean().optional(),
  status: z.string(),
  rejected_reason: z.string().optional(),
  created_at: z.string(),
}).transform((qualification) => {
  let status = qualification.status;
  if (qualification.superseded && (status === "verified" || status === "expired")) {
    status = "superseded";
  } else if (status === "verified") {
    const days = qualification.expires_in_days;
    status = days == null ? "approved" : days < 0 ? "expired" : days <= 30 ? "expiring" : "approved";
  }
  return {...qualification, status};
});

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
  // v1.2 managed rental (docs/26 §26.9); absent on legacy backends and manual products.
  fulfillment_mode: fulfillmentModeSchema.optional(),
  availability: z.enum(["fulltime", "night_window"]).optional(),
  night_start_min: z.number().int().min(0).max(1439).nullable().optional(),
  night_end_min: z.number().int().min(0).max(1439).nullable().optional(),
  card_split_options: z.array(z.number().int()).nullable().optional(),
  max_free_per_node: z.number().int().nonnegative().nullable().optional(),
  prices: z.array(productPriceSchema).nullable().optional(),
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
  current_lease: currentLeaseSchema.nullable().optional(),
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
  // v1.2 (docs/25 §25.7.6): absent on legacy backends, which keeps the manual-mode UX.
  fulfillment_mode: fulfillmentModeSchema.optional(),
  // v1.2 包夜 snapshot (SupplierOrder embeds Order, compute/repository.go); null for non-nightly orders.
  night_start_date: z.string().nullable().optional(),
  night_start_min: z.number().int().nullable().optional(),
  night_end_min: z.number().int().nullable().optional(),
  // compute/repository.go:112 is still `json:"-"` on orders (only settlement rows expose it), so the
  // order modal shows the generic "租期结束后分账" copy; read only if the backend starts exposing it.
  settle_ready_at: z.string().nullable().optional(),
});

const settlementSchema = z.object({
  id: z.number().int().positive(),
  settlement_id: z.string(),
  order_no: z.string(),
  payee_type: z.string(),
  payee_id: z.number().int().nonnegative(),
  amount: z.number().int().nonnegative(),
  status: z.string(),
  fail_reason: z.string().nullable().optional(),
  created_at: z.string(),
  // payment/repository.go:27 Settlement (T-106, migration 037). `amount` is already net of
  // refund_deduction; platform_compensation is the part of that deduction the platform bears.
  refund_deduction: z.number().int().nonnegative().optional().default(0),
  platform_compensation: z.number().int().nonnegative().optional().default(0),
  // The order's mode and split-ready time (payment/repository.go:52-53, integ b625305); settle_ready_at
  // stays null for manual orders and for managed orders until the lease ends and outages are settled.
  fulfillment_mode: fulfillmentModeSchema.optional(),
  settle_ready_at: z.string().nullable().optional(),
});

// 供给方易宝收款账户(分账接收商编)开通状态。
const paymentAccountSchema = z.object({
  status: z.enum(["not_started", "pending", "completed"]),
  application_status: z.string(),
  merchant_no: z.string().nullable(),
  audit_opinion: z.string(),
  netin_url: z.string().url().refine((value) => new URL(value).protocol === "https:").optional(),
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
  data: z.object({
    id: z.number().int(),
    // v1.2: non-blocking price inversion hints (docs/26 §26.3.2). The element shape is not pinned
    // in the doc, so accept plain strings or {message} objects; a malformed hint never fails a
    // submit that the backend already accepted.
    warnings: z.array(z.union([
      z.string(),
      z.object({message: z.string()}).passthrough().transform((warning) => warning.message),
    ])).nullable().optional().catch(null),
  }).optional(),
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

/** Managed row whose split waits for the lease to end (settle_ready_at not yet written). */
export function awaitsLeaseEndSplit(item: Pick<SupplierSettlement, "fulfillment_mode" | "settle_ready_at">) {
  return item.fulfillment_mode === "managed" && !item.settle_ready_at;
}

/**
 * Managed-order recalculation shown under the amount (payment/managed_split.go): the amount locked at
 * collection is `amount + refund_deduction`; `platform_compensation` is the platform-liable part of the
 * deduction that the platform makes good separately. Null when nothing was deducted.
 */
export function settlementAdjustment(item: Pick<SupplierSettlement, "amount" | "refund_deduction" | "platform_compensation">) {
  if (!item.refund_deduction && !item.platform_compensation) return null;
  return {
    locked: item.amount + item.refund_deduction,
    deduction: item.refund_deduction,
    compensation: item.platform_compensation,
  };
}
export type SupplierPaymentAccount = z.infer<typeof paymentAccountSchema>;
export type SupplierSettlementSummary = z.infer<typeof settlementSummarySchema>;
export type SupplierResourceSync = z.infer<typeof resourceSyncSchema>;

// Managed (platform-fulfilled) listings and orders; only an explicit backend field turns this on.
export function isManagedProduct(product: Pick<SupplierProduct, "fulfillment_mode"> | undefined) {
  return product?.fulfillment_mode === "managed";
}

export function isManagedOrder(order: Pick<SupplierOrder, "fulfillment_mode"> | undefined) {
  return order?.fulfillment_mode === "managed";
}

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
  // v1.2 managed rental fields; only sent for managed card rental products.
  fulfillment_mode?: "manual" | "managed";
  availability?: "fulltime" | "night_window";
  night_start_min?: number;
  night_end_min?: number;
  // compute CreateProductReq.CardSplitOptions []int (values from {1,2,4,6,8}, ≤ card_count).
  card_split_options?: number[];
  prices?: {pricing_mode: string; unit_price: number; min_duration: number; enabled: boolean}[];
};

export type SubmitQualificationInput = {
  expires_at?: string | null;
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
    throw new BackendRequestError("卖家工作台服务暂不可用", {code: null, status: 0});
  }
  const parsed = schema.safeParse(await response.json().catch(() => null));
  if (!parsed.success || !parsed.data) throw new BackendRequestError("服务返回格式错误", {code: null, status: response.status});
  if (!response.ok || parsed.data.code !== 0) {
    // Keeps the backend code (e.g. 40900 on a product submit) for callers that branch on it.
    throw new BackendRequestError(parsed.data.message || fallbackMessage, {code: parsed.data.code, status: response.status});
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
    {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({...input, compliance_version: LEGAL_VERSION})},
    fetchImplementation,
  );
}

export function resubmitProduct(id: number, input: CreateProductInput, fetchImplementation: typeof fetch = fetch) {
  return request(`/api/supplier/products/${id}`, createProductEnvelopeSchema, "商品重新提交失败",
    {method: "PUT", headers: {"content-type": "application/json"}, body: JSON.stringify({...input, compliance_version: LEGAL_VERSION})}, fetchImplementation);
}

// 供给方主动下架自己的商品(在售/待审核); 下架后可修改并重提, 重提回 pending 重新审核。
export function offlineMyProduct(id: number, fetchImplementation: typeof fetch = fetch) {
  return request(`/api/supplier/products/${id}/offline`, actionEnvelopeSchema, "商品下架失败",
    {method: "PATCH"}, fetchImplementation);
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

const paymentAccountEnvelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: paymentAccountSchema.optional(),
});

async function paymentAccountRequest(init: RequestInit | undefined, fallback: string, fetchImplementation: typeof fetch) {
  const result = await request("/api/supplier/payment-account", paymentAccountEnvelopeSchema, fallback, {cache: "no-store", ...init}, fetchImplementation);
  if (!result.data) throw new Error(fallback);
  return result.data;
}

export function fetchSupplierPaymentAccount(fetchImplementation: typeof fetch = fetch) {
  return paymentAccountRequest(undefined, "收款账户状态读取失败", fetchImplementation);
}

// startSupplierPaymentAccount 获取易宝入网(开通收款商编)链接; 已有申请时复用同一申请单。
export function startSupplierPaymentAccount(fetchImplementation: typeof fetch = fetch) {
  return paymentAccountRequest({method: "POST"}, "收款账户开通链接获取失败", fetchImplementation);
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
