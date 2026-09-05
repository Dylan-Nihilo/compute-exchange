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

const buyerOrderDetailSchema = z.object({
  order: z.object({
    order_no: z.string().min(1),
    status: orderStatusSchema,
    quantity: z.number().int().positive(),
    duration: z.number().int().positive(),
    unit_price: z.number().int().nonnegative(),
    total_amount: z.number().int().nonnegative(),
    platform_fee: z.number().int().nonnegative(),
    payment_expires_at: z.string().nullable(),
    lease_start_at: z.string().nullable(),
    lease_end_at: z.string().nullable(),
    compliance_agreed: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
  }),
  product: z.object({
    id: z.number().int().positive(),
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
    region: z.string(),
    self_operated: z.boolean(),
  }),
  supplier: z.object({
    name: z.string(),
    self_operated: z.boolean(),
    credit: z.object({
      fulfill_rate: z.number(),
      sla_rate: z.number(),
      violation_count: z.number().int().nonnegative(),
      total_orders: z.number().int().nonnegative(),
      updated_at: z.string(),
    }).nullable(),
  }),
  delivery: z.object({
    access_status: z.enum(["none", "generated", "delivered", "revoked"]),
    access_expires_at: z.string().nullable(),
    revoked_at: z.string().nullable(),
    confirmed_by_buyer: z.boolean(),
    buyer_confirmed_at: z.string().nullable(),
    created_at: z.string(),
  }).nullable(),
  actions: z.object({
    can_confirm: z.boolean(),
    can_renew: z.boolean(),
    can_refund: z.boolean(),
    can_view_credential: z.boolean(),
  }),
});

const orderDetailEnvelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: buyerOrderDetailSchema.optional(),
});

const accessCredentialSchema = z.object({
  access_key: z.string(),
  access_value: z.string(),
  access_status: z.enum(["none", "generated", "delivered", "revoked"]),
  access_expires_at: z.string().nullable(),
  revoked_at: z.string().nullable(),
  masked: z.boolean(),
});

const accessCredentialEnvelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: accessCredentialSchema.optional(),
});

export type BuyerOrder = z.infer<typeof buyerOrderSchema>;
export type BuyerOrderDetail = z.infer<typeof buyerOrderDetailSchema>;
export type BuyerOrderAccessCredential = z.infer<typeof accessCredentialSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type BuyerBillingStatusFilter = "all" | "pending" | "paid" | "refund";
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
  return fetchBuyerOrdersPage(
    query,
    fetchImplementation,
    process.env.NODE_ENV === "development",
  );
}

export async function fetchAllBuyerOrders(
  fetchImplementation: typeof fetch = fetch,
) {
  const firstPage = await fetchBuyerOrders({pageSize: 100}, fetchImplementation);
  const orders = [...firstPage.orders];
  const totalPages = Math.ceil(firstPage.total / firstPage.pageSize);

  for (let page = 2; page <= totalPages; page += 1) {
    const result = await fetchBuyerOrders(
      {page, pageSize: firstPage.pageSize},
      fetchImplementation,
    );
    orders.push(...result.orders);
  }

  return orders;
}

async function fetchBuyerOrdersPage(
  query: BuyerOrdersQuery,
  fetchImplementation: typeof fetch,
  seedLocalFixtures: boolean,
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
  const result = {
    orders: parsed.data.data.list ?? [],
    total: parsed.data.data.total,
    page: parsed.data.data.page,
    pageSize: parsed.data.data.page_size,
  };
  if (
    seedLocalFixtures &&
    result.total === 0 &&
    !query.status &&
    !query.orderNo &&
    (query.page ?? 1) === 1
  ) {
    const seedResponse = await fetchImplementation("/api/dev/fixtures/buyer-orders", {
      method: "POST",
    });
    const seeded = actionEnvelopeSchema.safeParse(
      await seedResponse.json().catch(() => null),
    );
    if (!seeded.success || !seedResponse.ok || seeded.data.code !== 0) {
      throw new Error(seeded.success ? seeded.data.message : "本地测试订单生成失败");
    }
    return fetchBuyerOrdersPage(query, fetchImplementation, false);
  }
  return result;
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

export async function fetchBuyerOrderDetail(
  orderNo: string,
  fetchImplementation: typeof fetch = fetch,
) {
  if (!isBuyerOrderNo(orderNo)) throw new Error("订单编号无效");

  let response: Response;
  try {
    response = await fetchImplementation(
      `/api/buyer/orders/${encodeURIComponent(orderNo)}`,
      {cache: "no-store"},
    );
  } catch {
    throw new Error("订单服务暂不可用");
  }
  const parsed = orderDetailEnvelopeSchema.safeParse(
    await response.json().catch(() => null),
  );
  if (!parsed.success) throw new Error("订单服务返回格式错误");
  if (!response.ok || parsed.data.code !== 0 || !parsed.data.data) {
    throw new Error(parsed.data.message || "订单详情读取失败");
  }
  return parsed.data.data;
}

export function fetchBuyerOrderCredential(
  orderNo: string,
  fetchImplementation: typeof fetch = fetch,
) {
  return requestBuyerOrderCredential(orderNo, false, fetchImplementation);
}

export function revealBuyerOrderCredential(
  orderNo: string,
  fetchImplementation: typeof fetch = fetch,
) {
  return requestBuyerOrderCredential(orderNo, true, fetchImplementation);
}

export function isBuyerOrderNo(value: string) {
  return /^(?:ORD|REN)[A-Za-z0-9-]{6,29}$/.test(value);
}

const paymentEnvelopeSchema = z.object({
  code: z.number(), message: z.string().optional(),
  data: z.object({pay_url: z.string().url().refine((value) => new URL(value).protocol === "https:"), tx_id: z.string().min(1)}).optional(),
});

export async function startBuyerOrderPayment(orderNo: string, channel: "wechat" | "alipay" | "bank", fetchImplementation: typeof fetch = fetch) {
  const response = await fetchImplementation("/api/buyer/payment/pay", {
    method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({order_no: orderNo, channel}),
  });
  const parsed = paymentEnvelopeSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new Error("支付服务返回格式错误");
  if (parsed.data.code === 50000) throw new Error("在线支付暂不可用，请稍后重试或联系平台");
  if (!response.ok || parsed.data.code !== 0 || !parsed.data.data) throw new Error(parsed.data.message || "支付发起失败");
  return parsed.data.data;
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

export function filterBuyerBillingOrders(
  orders: readonly BuyerOrder[],
  status: BuyerBillingStatusFilter,
  orderNumber: string,
) {
  const query = orderNumber.trim().replace(/^#/, "").toLowerCase();

  return [...orders]
    .filter((order) =>
      (status === "all" || buyerBillingCategory(order.status) === status) &&
      (!query || order.order_no.toLowerCase().includes(query)),
    )
    .sort((left, right) => right.created_at.localeCompare(left.created_at));
}

export function summarizeBuyerBilling(
  orders: readonly BuyerOrder[],
  now = new Date(),
) {
  const month = chinaMonth(now);

  return orders.reduce(
    (summary, order) => {
      const category = buyerBillingCategory(order.status);
      if (category === "paid") {
        summary.paidMinor += order.total_amount;
        if (chinaMonth(new Date(order.created_at)) === month) {
          summary.monthSpendMinor += order.total_amount;
        }
      } else if (order.status === "refunded") {
        summary.refundedMinor += order.total_amount;
      } else if (category === "pending") {
        summary.pendingMinor += order.total_amount;
      }
      return summary;
    },
    {monthSpendMinor: 0, paidMinor: 0, pendingMinor: 0, refundedMinor: 0},
  );
}

function chinaMonth(date: Date) {
  const parts = new Intl.DateTimeFormat("en", {
    month: "2-digit",
    timeZone: "Asia/Shanghai",
    year: "numeric",
  }).formatToParts(date);
  return `${parts.find(({type}) => type === "year")?.value}-${parts.find(({type}) => type === "month")?.value}`;
}

function buyerBillingCategory(
  status: OrderStatus,
): Exclude<BuyerBillingStatusFilter, "all"> | "closed" {
  if (status === "pending_payment") return "pending";
  if (["paid", "provisioning", "active", "completed"].includes(status)) {
    return "paid";
  }
  if (status === "refunding" || status === "refunded") return "refund";
  return "closed";
}

async function requestBuyerOrderCredential(
  orderNo: string,
  reveal: boolean,
  fetchImplementation: typeof fetch,
) {
  if (!isBuyerOrderNo(orderNo)) throw new Error("订单编号无效");
  const suffix = reveal ? "/reveal" : "";

  let response: Response;
  try {
    response = await fetchImplementation(
      `/api/buyer/orders/${encodeURIComponent(orderNo)}/access-credential${suffix}`,
      reveal ? {method: "POST"} : {cache: "no-store"},
    );
  } catch {
    throw new Error("凭证服务暂不可用");
  }
  const parsed = accessCredentialEnvelopeSchema.safeParse(
    await response.json().catch(() => null),
  );
  if (!parsed.success) throw new Error("凭证服务返回格式错误");
  if (!response.ok || parsed.data.code !== 0 || !parsed.data.data) {
    throw new Error(parsed.data.message || "访问凭证读取失败");
  }
  return parsed.data.data;
}
