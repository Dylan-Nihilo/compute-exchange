import {z} from "zod";

export const buyerOrderStatuses = [
  "pending_payment",
  "paid",
  "provisioning",
  "active",
  "completed",
  "cancelled",
  "refunding",
  "refunded",
  "frozen",
] as const;

const orderStatusSchema = z.enum(buyerOrderStatuses);

const buyerOrderSchema = z.object({
  id: z.number().int().positive(),
  order_no: z.string().min(1),
  buyer_id: z.number().int().positive(),
  product_id: z.number().int().positive(),
  quantity: z.number().int().positive(),
  duration: z.number().int().positive(),
  unit_price: z.number().int().nonnegative(),
  total_amount: z.number().int().nonnegative(),
  platform_fee: z.number().int().nonnegative(),
  status: orderStatusSchema,
  payment_expires_at: z.string().nullable(),
  lease_start_at: z.string().nullable(),
  lease_end_at: z.string().nullable(),
  compliance_agreed: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  product_type: z.string().optional(),
  gpu_model: z.string().optional(),
  pricing_mode: z.string().optional(),
  self_operated: z.boolean().optional(),
  supplier_name: z.string().optional(),
});

const orderPageEnvelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z.object({
    list: z.array(buyerOrderSchema).nullable(),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
  }).optional(),
});

const actionEnvelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
});

export type BuyerOrder = z.infer<typeof buyerOrderSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export interface BuyerOrdersQuery {
  status?: OrderStatus;
  orderNo?: string;
  page?: number;
  pageSize?: number;
}

export const buyerOrderStatusCopy: Record<OrderStatus, string> = {
  pending_payment: "待支付",
  paid: "已支付",
  provisioning: "待确认签收",
  active: "履约中",
  completed: "已完成",
  cancelled: "已取消",
  refunding: "退款中",
  refunded: "已退款",
  frozen: "已冻结",
};

export async function fetchBuyerOrders(
  query: BuyerOrdersQuery = {},
  fetchImplementation: typeof fetch = fetch,
) {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    page_size: String(query.pageSize ?? 100),
  });
  if (query.status) params.set("status", query.status);
  if (query.orderNo) params.set("order_no", query.orderNo);

  let response: Response;
  try {
    response = await fetchImplementation(`/api/buyer/orders?${params}`, {
      cache: "no-store",
    });
  } catch {
    throw new Error("订单服务暂不可用");
  }
  const parsed = orderPageEnvelopeSchema.safeParse(
    await response.json().catch(() => null),
  );
  if (!parsed.success) throw new Error("订单服务返回格式错误");
  if (!response.ok || parsed.data.code !== 0 || !parsed.data.data) {
    throw new Error(parsed.data.message || "订单读取失败");
  }
  return {
    orders: parsed.data.data.list ?? [],
    total: parsed.data.data.total,
    page: parsed.data.data.page,
    pageSize: parsed.data.data.page_size,
  };
}

export async function confirmBuyerOrder(
  orderNo: string,
  fetchImplementation: typeof fetch = fetch,
) {
  if (!isBuyerOrderNo(orderNo)) throw new Error("订单编号无效");

  let response: Response;
  try {
    response = await fetchImplementation(
      `/api/buyer/orders/${encodeURIComponent(orderNo)}/confirm`,
      {method: "POST"},
    );
  } catch {
    throw new Error("订单服务暂不可用");
  }
  const parsed = actionEnvelopeSchema.safeParse(
    await response.json().catch(() => null),
  );
  if (!parsed.success) throw new Error("订单服务返回格式错误");
  if (!response.ok || parsed.data.code !== 0) {
    throw new Error(parsed.data.message || "确认签收失败");
  }
}

export function isBuyerOrderNo(value: string) {
  return /^(?:ORD|REN)[A-Za-z0-9-]{6,61}$/.test(value);
}

export function summarizeBuyerOrders(
  orders: readonly BuyerOrder[],
  total: number,
  now = new Date(),
) {
  const paidStatuses = new Set<OrderStatus>([
    "paid",
    "provisioning",
    "active",
    "completed",
  ]);
  const inProgressStatuses = new Set<OrderStatus>([
    "paid",
    "provisioning",
    "active",
  ]);
  const month = chinaMonth(now);

  return {
    pendingPayment: orders.filter(({status}) => status === "pending_payment").length,
    pendingReceipt: orders.filter(({status}) => status === "provisioning").length,
    inProgress: orders.filter(({status}) => inProgressStatuses.has(status)).length,
    monthSpendMinor: orders.reduce(
      (sum, order) =>
        paidStatuses.has(order.status) && chinaMonth(new Date(order.created_at)) === month
          ? sum + order.total_amount
          : sum,
      0,
    ),
    recentOrders: orders.slice(0, 3),
    isTruncated: total > orders.length,
  };
}

function chinaMonth(date: Date) {
  const parts = new Intl.DateTimeFormat("en", {
    month: "2-digit",
    timeZone: "Asia/Shanghai",
    year: "numeric",
  }).formatToParts(date);
  return `${parts.find(({type}) => type === "year")?.value}-${parts.find(({type}) => type === "month")?.value}`;
}
