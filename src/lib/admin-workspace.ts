import {z} from "zod";

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
  application: z.object({
    company_name: z.string(),
    credit_code: z.string(),
    representative: z.string(),
    representative_id_number: z.string(),
    business_license_file_name: z.string(),
    contact_method: z.string(),
    bank_name: z.string(),
    account_name: z.string(),
    account_number: z.string(),
    facility_address: z.string(),
    has_idc_license: z.boolean(),
    power_description: z.string(),
    cooling_description: z.string(),
  }).optional(),
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
  created_at: z.string(),
  updated_at: z.string(),
});

const orderSchema = z.object({
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
});

const invoiceSchema = z.object({
  id: z.number().int().positive(),
  invoice_no: z.string(),
  buyer_id: z.number().int().positive(),
  company_name: z.string(),
  tax_no: z.string(),
  bank_name: z.string(),
  bank_account: z.string(),
  amount_fen: z.number().int().nonnegative(),
  invoice_type: z.string(),
  status: z.string(),
  tax_invoice_no: z.string().nullable().optional(),
  pdf_filename: z.string().nullable().optional(),
  reject_reason: z.string().nullable().optional(),
  applied_at: z.string(),
  issued_at: z.string().nullable(),
});

const ticketSchema = z.object({
  id: z.number().int().positive(),
  ticket_no: z.string(),
  buyer_id: z.number().int().positive(),
  order_no: z.string(),
  type: z.string(),
  title: z.string(),
  content: z.string(),
  status: z.string(),
  resolved_at: z.string().nullable(),
  closed_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

const leadSchema = z.object({
  id: z.number().int().positive(),
  type: z.string(),
  contact_name: z.string(),
  contact_phone: z.string(),
  contact_email: z.string(),
  description: z.string(),
  amount_range: z.string(),
  term: z.string(),
  status: z.string(),
  assignee_id: z.number().int().positive().nullable(),
  created_at: z.string(),
});

const alertSchema = z.object({
  id: z.number().int().positive(),
  level: z.string(),
  alert_type: z.string(),
  target_type: z.string(),
  target_id: z.number().int().nonnegative(),
  rule_detail: z.string(),
  status: z.string(),
  created_at: z.string(),
});

const auditLogSchema = z.object({
  id: z.number().int().positive(),
  operator_id: z.number().int().nonnegative(),
  action: z.string(),
  target_type: z.string(),
  target_id: z.number().int().nonnegative(),
  before_value: z.string(),
  after_value: z.string(),
  ip: z.string(),
  created_at: z.string(),
});

const userSchema = z.object({
  id: z.number().int().positive(),
  phone: z.string(),
  email: z.string(),
  status: z.string(),
  roles: z.array(z.string()),
  created_at: z.string(),
});

const paymentSchema = z.object({
  id: z.number().int().positive(),
  payment_no: z.string().optional(),
  order_no: z.string().optional(),
  amount: z.number().int().nonnegative().optional(),
  status: z.string().optional(),
  created_at: z.string().optional(),
}).passthrough();

const configSchema = z.object({
  fee_rate: z.number().int().nonnegative(),
  trading_enabled: z.boolean(),
});

const noticeSchema = z.object({
  id: z.number().int().positive(),
  content: z.string(),
  status: z.string(),
  created_by: z.number().int().positive(),
  created_at: z.string(),
});

const envelope = <T extends z.ZodTypeAny>(data: T) =>
  z.object({code: z.number().int(), message: z.string(), data: data.optional()});

const listEnvelope = <T extends z.ZodTypeAny>(item: T) =>
  envelope(z.array(item).nullable());

const pageEnvelope = <T extends z.ZodTypeAny>(item: T) =>
  envelope(
    z.object({
      list: z.array(item).nullable(),
      total: z.number().int().nonnegative(),
      page: z.number().int().positive(),
      page_size: z.number().int().positive(),
    }),
  );

const actionEnvelope = envelope(z.unknown());

export type AdminQualification = z.infer<typeof qualificationSchema>;
export type AdminProduct = z.infer<typeof productSchema>;
export type AdminOrder = z.infer<typeof orderSchema>;
export type AdminInvoice = z.infer<typeof invoiceSchema>;
export type AdminTicket = z.infer<typeof ticketSchema>;
export type AdminLead = z.infer<typeof leadSchema>;
export type AdminRiskAlert = z.infer<typeof alertSchema>;
export type AdminAuditLog = z.infer<typeof auditLogSchema>;
export type AdminUser = z.infer<typeof userSchema>;
export type AdminPayment = z.infer<typeof paymentSchema>;
export type AdminConfig = z.infer<typeof configSchema>;
export type AdminNotice = z.infer<typeof noticeSchema>;

type FetchPage = {page?: number; pageSize?: number};

async function request<T extends {code: number; message: string}>(
  url: string,
  schema: z.ZodType<T>,
  fallbackMessage: string,
  init?: RequestInit,
  fetchImplementation: typeof fetch = fetch,
) {
  let response: Response;
  try {
    response = await fetchImplementation(url, init);
  } catch {
    throw new Error("管理工作台服务暂不可用");
  }
  const parsed = schema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new Error("管理服务返回格式错误");
  if (!response.ok || parsed.data.code !== 0) {
    throw new Error(parsed.data.message || fallbackMessage);
  }
  return parsed.data;
}

function pageQuery({page = 1, pageSize = 20}: FetchPage = {}) {
  return `page=${page}&page_size=${pageSize}`;
}

function action(
  url: string,
  fallbackMessage: string,
  init: RequestInit,
  fetchImplementation: typeof fetch,
) {
  return request(url, actionEnvelope, fallbackMessage, init, fetchImplementation);
}

export function fetchAdminQualifications(
  status: "pending" | "all" = "pending",
  fetchImplementation: typeof fetch = fetch,
) {
  const query = status === "all" ? "?status=all" : "";
  return request(
    `/api/admin/audits/qualifications${query}`,
    listEnvelope(qualificationSchema),
    "资质审核列表读取失败",
    undefined,
    fetchImplementation,
  ).then(({data}) => data ?? []);
}

export function approveQualification(id: number, fetchImplementation: typeof fetch = fetch) {
  return action(`/api/admin/audits/qualifications/${id}/approve`, "资质审核失败", {method: "POST"}, fetchImplementation);
}

export function rejectQualification(id: number, reason: string, fetchImplementation: typeof fetch = fetch) {
  return action(
    `/api/admin/audits/qualifications/${id}/reject`,
    "资质驳回失败",
    {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({reason})},
    fetchImplementation,
  );
}

export function fetchAdminProducts(query: FetchPage = {}, fetchImplementation: typeof fetch = fetch) {
  return request(`/api/admin/products?${pageQuery(query)}`, pageEnvelope(productSchema), "商品列表读取失败", undefined, fetchImplementation)
    .then(({data}) => ({items: data?.list ?? [], total: data?.total ?? 0}));
}

export function reviewProduct(id: number, decision: "approve" | "reject", fetchImplementation: typeof fetch = fetch) {
  return action(`/api/admin/audits/products/${id}/${decision}`, "商品审核失败", {method: "POST"}, fetchImplementation);
}

export function offlineProduct(id: number, fetchImplementation: typeof fetch = fetch) {
  return action(`/api/admin/products/${id}/offline`, "商品下架失败", {method: "PATCH"}, fetchImplementation);
}

export function fetchAdminOrders(query: FetchPage = {}, fetchImplementation: typeof fetch = fetch) {
  return request(`/api/admin/orders?${pageQuery(query)}`, pageEnvelope(orderSchema), "订单列表读取失败", undefined, fetchImplementation)
    .then(({data}) => ({items: data?.list ?? [], total: data?.total ?? 0}));
}

export function updateAdminOrderStatus(id: number, status: string, fetchImplementation: typeof fetch = fetch) {
  return action(
    `/api/admin/orders/${id}/status`,
    "订单状态更新失败",
    {method: "PATCH", headers: {"content-type": "application/json"}, body: JSON.stringify({status})},
    fetchImplementation,
  );
}

export function fetchAdminInvoices(query: FetchPage & {status?: string} = {}, fetchImplementation: typeof fetch = fetch) {
  const params = new URLSearchParams(pageQuery(query));
  if (query.status) params.set("status", query.status);
  return request(`/api/admin/invoices?${params}`, pageEnvelope(invoiceSchema), "发票列表读取失败", undefined, fetchImplementation)
    .then(({data}) => ({items: data?.list ?? [], total: data?.total ?? 0}));
}

export function rejectAdminInvoice(id: number, reason: string, fetchImplementation: typeof fetch = fetch) {
  return action(
    `/api/admin/invoices/${id}/reject`,
    "发票驳回失败",
    {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({reason})},
    fetchImplementation,
  );
}

export function issueAdminInvoice(
  id: number,
  pdf: File,
  taxInvoiceNo = "",
  fetchImplementation: typeof fetch = fetch,
) {
  const body = new FormData();
  body.set("pdf", pdf);
  if (taxInvoiceNo.trim()) body.set("tax_invoice_no", taxInvoiceNo.trim());
  return action(
    `/api/admin/invoices/${id}/issue`,
    "开票提交失败",
    {method: "POST", body},
    fetchImplementation,
  );
}

export function fetchAdminTickets(query: FetchPage = {}, fetchImplementation: typeof fetch = fetch) {
  return request(`/api/admin/tickets?${pageQuery(query)}`, pageEnvelope(ticketSchema), "工单列表读取失败", undefined, fetchImplementation)
    .then(({data}) => ({items: data?.list ?? [], total: data?.total ?? 0}));
}

export function updateAdminTicket(
  id: number,
  decision: "claim" | "resolve" | "close",
  fetchImplementation: typeof fetch = fetch,
) {
  return action(`/api/admin/tickets/${id}/${decision}`, "工单状态更新失败", {method: "POST"}, fetchImplementation);
}

export function fetchAdminPayments(fetchImplementation: typeof fetch = fetch) {
  return request("/api/admin/payment/list", listEnvelope(paymentSchema), "支付流水读取失败", undefined, fetchImplementation)
    .then(({data}) => data ?? []);
}

export function fetchAdminLeads(query: FetchPage = {}, fetchImplementation: typeof fetch = fetch) {
  return request(`/api/admin/leads?${pageQuery(query)}`, pageEnvelope(leadSchema), "线索列表读取失败", undefined, fetchImplementation)
    .then(({data}) => ({items: data?.list ?? [], total: data?.total ?? 0}));
}

export function assignAdminLead(id: number, assigneeId: number, fetchImplementation: typeof fetch = fetch) {
  return action(
    `/api/admin/leads/${id}/assign`,
    "线索分配失败",
    {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({assignee_id: assigneeId})},
    fetchImplementation,
  );
}

export function fetchAdminRiskAlerts(query: FetchPage = {}, fetchImplementation: typeof fetch = fetch) {
  return request(`/api/admin/risk/alerts?${pageQuery(query)}`, pageEnvelope(alertSchema), "风控告警读取失败", undefined, fetchImplementation)
    .then(({data}) => ({items: data?.list ?? [], total: data?.total ?? 0}));
}

export function resolveRiskAlert(id: number, decision: "freeze" | "dismiss", fetchImplementation: typeof fetch = fetch) {
  return action(`/api/admin/risk/alerts/${id}/${decision}`, "告警处置失败", {method: "POST"}, fetchImplementation);
}

export function fetchAdminAuditLogs(query: FetchPage = {}, fetchImplementation: typeof fetch = fetch) {
  return request(`/api/admin/audit-logs?${pageQuery(query)}`, pageEnvelope(auditLogSchema), "审计日志读取失败", undefined, fetchImplementation)
    .then(({data}) => ({items: data?.list ?? [], total: data?.total ?? 0}));
}

export function fetchAdminConfig(fetchImplementation: typeof fetch = fetch) {
  return request("/api/admin/config", envelope(configSchema), "系统配置读取失败", undefined, fetchImplementation)
    .then(({data}) => data ?? {fee_rate: 0, trading_enabled: false});
}

export function updateAdminConfig(key: string, value: string, fetchImplementation: typeof fetch = fetch) {
  return action(
    "/api/admin/config",
    "系统配置更新失败",
    {method: "PUT", headers: {"content-type": "application/json"}, body: JSON.stringify({key, value})},
    fetchImplementation,
  );
}

export function fetchAdminUsers(fetchImplementation: typeof fetch = fetch) {
  return request("/api/admin/users", envelope(z.array(userSchema)), "用户列表读取失败", undefined, fetchImplementation)
    .then(({data}) => data ?? []);
}

export function freezeAdminUser(id: number, fetchImplementation: typeof fetch = fetch) {
  return action(`/api/admin/users/${id}/freeze`, "用户状态更新失败", {method: "PATCH"}, fetchImplementation);
}

export function createAdminNotice(content: string, fetchImplementation: typeof fetch = fetch) {
  return action(
    "/api/admin/cms/notices",
    "公告发布失败",
    {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({content})},
    fetchImplementation,
  );
}

export function fetchAdminNotices(fetchImplementation: typeof fetch = fetch) {
  return request("/api/admin/cms/notices", listEnvelope(noticeSchema), "公告读取失败", undefined, fetchImplementation)
    .then(({data}) => data ?? []);
}

export async function fetchAdminSummary(fetchImplementation: typeof fetch = fetch) {
  const [qualifications, products, orders, alerts] = await Promise.all([
    fetchAdminQualifications("pending", fetchImplementation),
    fetchAdminProducts({pageSize: 100}, fetchImplementation),
    fetchAdminOrders({pageSize: 100}, fetchImplementation),
    fetchAdminRiskAlerts({pageSize: 100}, fetchImplementation),
  ]);
  return {
    pendingQualifications: qualifications.filter(({status}) => status === "pending").length,
    pendingProducts: products.items.filter(({status}) => status === "pending").length,
    activeOrders: orders.items.filter(({status}) => !["completed", "cancelled", "refunded"].includes(status)).length,
    openRiskAlerts: alerts.items.filter(({status}) => status === "pending").length,
  };
}
