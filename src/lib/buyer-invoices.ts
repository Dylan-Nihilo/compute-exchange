import {z} from "zod";

export const invoiceStatuses = [
  "pending",
  "issued",
  "rejected",
  "red_flushed",
] as const;

const invoiceStatusSchema = z.enum(invoiceStatuses);
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

export const invoiceStatusCopy: Record<InvoiceStatus, string> = {
  pending: "审核中",
  issued: "已开票",
  rejected: "已驳回",
  red_flushed: "已红冲",
};

export const invoiceTypeCopy: Record<string, string> = {
  vat_special: "增值税专用发票",
};

const invoiceTitleSchema = z.object({
  id: z.number().int().positive(),
  buyer_id: z.number().int().positive(),
  title_type: z.string(),
  company_name: z.string(),
  tax_no: z.string(),
  bank_name: z.string(),
  bank_account: z.string(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

const billableOrderSchema = z.object({
  order_no: z.string().min(1),
  status: z.string(),
  quantity: z.number().int().positive(),
  total_amount: z.number().int().nonnegative(),
  gpu_model: z.string(),
  product_type: z.string(),
  pricing_mode: z.string(),
  created_at: z.string(),
});

const buyerInvoiceSchema = z.object({
  id: z.number().int().positive(),
  invoice_no: z.string().min(1),
  buyer_id: z.number().int().positive(),
  company_name: z.string(),
  tax_no: z.string(),
  bank_name: z.string(),
  bank_account: z.string(),
  amount_fen: z.number().int().nonnegative(),
  invoice_type: z.string(),
  status: invoiceStatusSchema,
  tax_invoice_no: z.string().nullable(),
  pdf_filename: z.string().nullish(),
  reject_reason: z.string().nullable(),
  applied_at: z.string(),
  issued_at: z.string().nullable(),
});

const titleEnvelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: invoiceTitleSchema.nullish(),
});

const billableOrdersEnvelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z.object({
    list: z.array(billableOrderSchema).nullable(),
    total: z.number().int().nonnegative(),
  }).optional(),
});

const applyEnvelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z.object({
    invoice_no: z.string(),
    amount_fen: z.number().int(),
    status: z.string(),
  }).optional(),
});

const invoicePageEnvelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z.object({
    list: z.array(buyerInvoiceSchema).nullable(),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
  }).optional(),
});

export type InvoiceTitle = z.infer<typeof invoiceTitleSchema>;
export type BillableOrder = z.infer<typeof billableOrderSchema>;
export type BuyerInvoice = z.infer<typeof buyerInvoiceSchema>;

export type SaveInvoiceTitleInput = {
  company_name: string;
  tax_no: string;
  bank_name: string;
  bank_account: string;
};

export type BuyerInvoicePage = {
  invoices: BuyerInvoice[];
  total: number;
  page: number;
  pageSize: number;
};

const taxNoPattern = /^[0-9A-Za-z]{15}$|^[0-9A-Za-z]{18}$|^[0-9A-Za-z]{20}$/;

export function isValidTaxNo(taxNo: string) {
  return taxNoPattern.test(taxNo.trim());
}

// 脱敏展示与 Figma 稿一致: 税号保留前 8 位, 银行账号保留前 4 位。
export function maskTaxNo(taxNo: string) {
  return taxNo.length <= 8 ? taxNo : `${taxNo.slice(0, 8)}******`;
}

export function maskBankAccount(account: string) {
  return account.length <= 4 ? account : `${account.slice(0, 4)}******`;
}

export async function fetchInvoiceTitle(
  fetchImplementation: typeof fetch = fetch,
): Promise<InvoiceTitle | null> {
  let response: Response;
  try {
    response = await fetchImplementation("/api/buyer/invoices/title", {cache: "no-store"});
  } catch {
    throw new Error("发票服务暂不可用");
  }
  const parsed = titleEnvelopeSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new Error("发票服务返回格式错误");
  if (!response.ok || parsed.data.code !== 0) {
    throw new Error(parsed.data.message || "开票信息读取失败");
  }
  return parsed.data.data ?? null;
}

export async function saveInvoiceTitle(
  input: SaveInvoiceTitleInput,
  fetchImplementation: typeof fetch = fetch,
): Promise<InvoiceTitle> {
  let response: Response;
  try {
    response = await fetchImplementation("/api/buyer/invoices/title", {
      method: "PUT",
      headers: {"content-type": "application/json"},
      body: JSON.stringify(input),
    });
  } catch {
    throw new Error("发票服务暂不可用");
  }
  const parsed = titleEnvelopeSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new Error("发票服务返回格式错误");
  if (!response.ok || parsed.data.code !== 0 || !parsed.data.data) {
    throw new Error(parsed.data.message || "开票信息保存失败");
  }
  return parsed.data.data;
}

export async function fetchBillableOrders(
  fetchImplementation: typeof fetch = fetch,
): Promise<BillableOrder[]> {
  let response: Response;
  try {
    response = await fetchImplementation("/api/buyer/invoices/billable-orders", {cache: "no-store"});
  } catch {
    throw new Error("发票服务暂不可用");
  }
  const parsed = billableOrdersEnvelopeSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new Error("发票服务返回格式错误");
  if (!response.ok || parsed.data.code !== 0) {
    throw new Error(parsed.data.message || "可开票订单读取失败");
  }
  return parsed.data.data?.list ?? [];
}

export async function applyInvoice(
  orderNos: readonly string[],
  fetchImplementation: typeof fetch = fetch,
) {
  if (orderNos.length === 0) throw new Error("请选择需要开票的订单");
  let response: Response;
  try {
    response = await fetchImplementation("/api/buyer/invoices/apply", {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({order_nos: orderNos}),
    });
  } catch {
    throw new Error("发票服务暂不可用");
  }
  const parsed = applyEnvelopeSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new Error("发票服务返回格式错误");
  if (!response.ok || parsed.data.code !== 0 || !parsed.data.data) {
    throw new Error(parsed.data.message || "开票申请提交失败");
  }
  return parsed.data.data;
}

export async function fetchBuyerInvoices(
  query: {page?: number; pageSize?: number} = {},
  fetchImplementation: typeof fetch = fetch,
): Promise<BuyerInvoicePage> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("page_size", String(query.pageSize));
  const url = `/api/buyer/invoices${params.size ? `?${params}` : ""}`;

  let response: Response;
  try {
    response = await fetchImplementation(url, {cache: "no-store"});
  } catch {
    throw new Error("发票服务暂不可用");
  }
  const parsed = invoicePageEnvelopeSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new Error("发票服务返回格式错误");
  if (!response.ok || parsed.data.code !== 0) {
    throw new Error(parsed.data.message || "发票列表读取失败");
  }
  const data = parsed.data.data;
  return {
    invoices: data?.list ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    pageSize: data?.page_size ?? 20,
  };
}

// 下载走浏览器原生 GET(BFF 流式代理), 返回可直接用作 href 的地址。
export function invoiceDownloadUrl(invoiceNo: string) {
  return `/api/buyer/invoices/${encodeURIComponent(invoiceNo)}/download`;
}
