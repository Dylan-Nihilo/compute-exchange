import {z} from "zod";

export const ticketStatuses = [
  "pending",
  "processing",
  "resolved",
  "closed",
] as const;

const ticketStatusSchema = z.enum(ticketStatuses);
export type TicketStatus = z.infer<typeof ticketStatusSchema>;

export const ticketStatusCopy: Record<TicketStatus, string> = {
  pending: "待处理",
  processing: "处理中",
  resolved: "已完结",
  closed: "已关闭",
};

export const ticketTypes = [
  "refund_dispute",
  "resource_fault",
  "unavailable",
  "appeal",
  "other",
] as const;

export const ticketTypeCopy: Record<string, string> = {
  refund_dispute: "退款纠纷",
  resource_fault: "资源故障",
  unavailable: "资源不可用",
  appeal: "申诉",
  other: "其他",
};

const ticketSchema = z.object({
  id: z.number().int().positive(),
  ticket_no: z.string().min(1),
  buyer_id: z.number().int().positive(),
  order_no: z.string().min(1),
  type: z.string(),
  title: z.string(),
  content: z.string(),
  status: ticketStatusSchema,
  resolved_at: z.string().nullable(),
  closed_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

const ticketMessageSchema = z.object({
  id: z.number().int().positive(),
  ticket_id: z.number().int().positive(),
  sender_type: z.enum(["buyer", "operator"]),
  sender_id: z.number().int().positive(),
  content: z.string(),
  created_at: z.string(),
});

const ticketPageEnvelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z.object({
    list: z.array(ticketSchema).nullable(),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
  }).optional(),
});

const createEnvelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z.object({
    ticket_no: z.string(),
    status: z.string(),
  }).optional(),
});

const detailEnvelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z.object({
    ticket: ticketSchema,
    messages: z.array(ticketMessageSchema).nullable(),
  }).optional(),
});

const actionEnvelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
});

export type BuyerTicket = z.infer<typeof ticketSchema>;
export type TicketMessage = z.infer<typeof ticketMessageSchema>;

export type CreateTicketInput = {
  order_no: string;
  type: string;
  title: string;
  content: string;
};

export type BuyerTicketPage = {
  tickets: BuyerTicket[];
  total: number;
  page: number;
  pageSize: number;
};

export type BuyerTicketDetail = {
  ticket: BuyerTicket;
  messages: TicketMessage[];
};

export function isTicketNo(value: string) {
  return /^WO-\d{8}-\d{3,}$/.test(value);
}

// 提交工单设计稿无独立标题字段: 标题取问题描述的前 30 字(换行归一为空格)。
export function ticketTitleFromContent(content: string) {
  const flattened = content.replace(/\s+/g, " ").trim();
  return flattened.length > 30 ? `${flattened.slice(0, 30)}…` : flattened;
}

async function parseEnvelope<T extends {code: number; message: string}>(
  response: Response,
  schema: {safeParse: (v: unknown) => {success: boolean; data?: T}},
  fallbackMessage: string,
) {
  const parsed = schema.safeParse(await response.json().catch(() => null));
  if (!parsed.success || !parsed.data) throw new Error("工单服务返回格式错误");
  if (!response.ok || parsed.data.code !== 0) {
    throw new Error(parsed.data.message || fallbackMessage);
  }
  return parsed.data;
}

export async function createTicket(
  input: CreateTicketInput,
  fetchImplementation: typeof fetch = fetch,
) {
  let response: Response;
  try {
    response = await fetchImplementation("/api/buyer/tickets", {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify(input),
    });
  } catch {
    throw new Error("工单服务暂不可用");
  }
  const data = await parseEnvelope(response, createEnvelopeSchema, "工单提交失败");
  if (!data.data) throw new Error("工单提交失败");
  return data.data;
}

export async function fetchBuyerTickets(
  query: {status?: string; keyword?: string; page?: number; pageSize?: number} = {},
  fetchImplementation: typeof fetch = fetch,
): Promise<BuyerTicketPage> {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.keyword) params.set("keyword", query.keyword);
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("page_size", String(query.pageSize));
  const url = `/api/buyer/tickets${params.size ? `?${params}` : ""}`;

  let response: Response;
  try {
    response = await fetchImplementation(url, {cache: "no-store"});
  } catch {
    throw new Error("工单服务暂不可用");
  }
  const data = await parseEnvelope(response, ticketPageEnvelopeSchema, "工单列表读取失败");
  return {
    tickets: data.data?.list ?? [],
    total: data.data?.total ?? 0,
    page: data.data?.page ?? 1,
    pageSize: data.data?.page_size ?? 20,
  };
}

export async function fetchBuyerTicketDetail(
  ticketNo: string,
  fetchImplementation: typeof fetch = fetch,
): Promise<BuyerTicketDetail> {
  if (!isTicketNo(ticketNo)) throw new Error("工单号无效");
  let response: Response;
  try {
    response = await fetchImplementation(
      `/api/buyer/tickets/${encodeURIComponent(ticketNo)}`,
      {cache: "no-store"},
    );
  } catch {
    throw new Error("工单服务暂不可用");
  }
  const data = await parseEnvelope(response, detailEnvelopeSchema, "工单详情读取失败");
  if (!data.data) throw new Error("工单详情读取失败");
  return {ticket: data.data.ticket, messages: data.data.messages ?? []};
}

export async function appendTicketMessage(
  ticketNo: string,
  content: string,
  fetchImplementation: typeof fetch = fetch,
) {
  if (!isTicketNo(ticketNo)) throw new Error("工单号无效");
  let response: Response;
  try {
    response = await fetchImplementation(
      `/api/buyer/tickets/${encodeURIComponent(ticketNo)}/messages`,
      {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({content}),
      },
    );
  } catch {
    throw new Error("工单服务暂不可用");
  }
  await parseEnvelope(response, actionEnvelopeSchema, "回复发送失败");
}

export async function closeTicket(
  ticketNo: string,
  fetchImplementation: typeof fetch = fetch,
) {
  if (!isTicketNo(ticketNo)) throw new Error("工单号无效");
  let response: Response;
  try {
    response = await fetchImplementation(
      `/api/buyer/tickets/${encodeURIComponent(ticketNo)}/close`,
      {method: "POST"},
    );
  } catch {
    throw new Error("工单服务暂不可用");
  }
  await parseEnvelope(response, actionEnvelopeSchema, "工单关闭失败");
}
