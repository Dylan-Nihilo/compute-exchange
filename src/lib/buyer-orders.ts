import {z} from "zod";

const orderStatusSchema = z.enum([
  "pending_payment",
  "paid",
  "provisioning",
  "active",
  "completed",
  "cancelled",
  "refunding",
  "refunded",
  "frozen",
]);

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
  fetchImplementation: typeof fetch = fetch,
) {
  const response = await fetchImplementation("/api/buyer/orders", {
    cache: "no-store",
  });
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
  };
}

export async function confirmBuyerOrder(
  orderId: number,
  fetchImplementation: typeof fetch = fetch,
) {
  const response = await fetchImplementation(
    `/api/buyer/orders/${orderId}/confirm`,
    {method: "POST"},
  );
  const parsed = actionEnvelopeSchema.safeParse(
    await response.json().catch(() => null),
  );
  if (!parsed.success) throw new Error("订单服务返回格式错误");
  if (!response.ok || parsed.data.code !== 0) {
    throw new Error(parsed.data.message || "确认签收失败");
  }
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
