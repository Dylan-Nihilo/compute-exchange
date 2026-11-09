import {z} from "zod";

import {ADMIN_PAGE_SIZE, pagedPayload} from "./admin-managed.ts";
import {jsonInit, requestEnvelope} from "./api/envelope.ts";

// v1.2 S2 operator views: lease outages + supplier credit (T-105) and partial refunds (T-106).
// Shapes follow backend fleet/outage.go:51 (Outage), fleet/outage_api.go:213 (AdminOutage),
// fleet/credit.go:35/243/250 (CreditScore / SupplierCreditDetail / SupplierCreditNode) and
// payment/partial_refund.go:40 (PartialRefund).

const BASE = "/api/admin";

function query(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const text = value == null ? "" : String(value).trim();
    if (text) search.set(key, text);
  }
  return search.size ? `?${search}` : "";
}

export const outageCauses = [
  "node_offline",
  "gpu_fault",
  "container_down",
  "full_probe_failed",
  "night_unpark_failed",
  "provision_delay",
  "gateway_down",
  "wrong_freeze",
] as const;

export const adminOutageSchema = z.object({
  id: z.number().int().positive(),
  lease_id: z.number().int().positive(),
  order_id: z.number().int().positive(),
  node_id: z.number().int().positive().nullable(),
  cause: z.string(),
  liable: z.string(),
  started_at: z.string(),
  ended_at: z.string().nullable(),
  seconds: z.number().int().nullable(),
  minutes: z.number().int().nullable(),
  counted: z.boolean().nullable(),
  remedy: z.enum(["extend", "refund"]).nullable(),
  remedy_applied_at: z.string().nullable(),
  remedy_amount: z.number().int().nullable(),
  liability_amount: z.number().int().nullable(),
  detail: z.string().nullable(),
  lease_no: z.string(),
  order_no: z.string(),
  supplier_id: z.number().int().positive().nullable(),
});
export type AdminOutage = z.infer<typeof adminOutageSchema>;

export type OutageFilter = {
  lease_no?: string;
  order_no?: string;
  cause?: string;
  supplier_id?: string;
  open?: boolean;
  refund_pending?: boolean;
  page?: number;
};

/** GET /admin/lease-outages; `open=1` = still ongoing, `refund_pending=1` = refund chosen but not applied. */
export function fetchAdminOutages(filter: OutageFilter, fetchImplementation?: typeof fetch) {
  return requestEnvelope(
    `${BASE}/lease-outages${query({
      lease_no: filter.lease_no,
      order_no: filter.order_no,
      cause: filter.cause,
      supplier_id: filter.supplier_id,
      open: filter.open ? 1 : undefined,
      refund_pending: filter.refund_pending ? 1 : undefined,
      page: filter.page ?? 1,
      page_size: ADMIN_PAGE_SIZE,
    })}`,
    pagedPayload(adminOutageSchema),
    {fallback: "停机记录读取失败", fetchImplementation},
  );
}

/** Operator-facing outage state; mirrors the buyer wording but keeps "待退费" visible as a queue. */
export function adminOutageStatus(item: Pick<AdminOutage, "ended_at" | "counted" | "remedy" | "remedy_applied_at">) {
  if (!item.ended_at) return "进行中";
  if (item.counted === null) return "待结算";
  if (!item.counted) return "不计入";
  if (item.remedy === "extend") return item.remedy_applied_at ? "已顺延" : "待顺延";
  if (item.remedy === "refund") return item.remedy_applied_at ? "已退费" : "待退费";
  return "已结算";
}

export const creditOverrideModes = ["auto", "allow", "stop"] as const;
export type CreditOverrideMode = (typeof creditOverrideModes)[number];
export const creditOverrideCopy: Record<CreditOverrideMode, string> = {auto: "按分数自动", allow: "强制放行", stop: "强制停调度"};

export const creditScoreSchema = z.object({
  supplier_id: z.number().int().positive(),
  score: z.number().int(),
  outage_minutes_30d: z.number().int().nonnegative(),
  outage_count_30d: z.number().int().nonnegative(),
  probe_failures_30d: z.number().int().nonnegative(),
  defaults_30d: z.number().int().nonnegative(),
  dispatch_stopped: z.boolean(),
  override_mode: z.enum(creditOverrideModes),
  override_by: z.number().int().nullable(),
  override_reason: z.string().nullable(),
  override_at: z.string().nullable(),
  computed_at: z.string().nullable(),
});
export type CreditScore = z.infer<typeof creditScoreSchema>;

export const creditDetailSchema = creditScoreSchema.extend({
  stop_below: z.number().int(),
  nodes: z
    .array(
      z.object({
        id: z.number().int().positive(),
        node_name: z.string(),
        dispatch_hold: z.boolean(),
        dispatch_hold_reason: z.string().nullable(),
        dispatch_hold_at: z.string().nullable(),
        schedulable: z.boolean(),
        outage_minutes_30d: z.number().int().nonnegative(),
      }),
    )
    .nullable()
    .transform((value) => value ?? []),
});
export type CreditDetail = z.infer<typeof creditDetailSchema>;

/** GET /admin/supplier-credits?stopped=1 — stored scores, lowest first. */
export function fetchSupplierCredits(filter: {stopped?: boolean; page?: number}, fetchImplementation?: typeof fetch) {
  return requestEnvelope(
    `${BASE}/supplier-credits${query({stopped: filter.stopped ? 1 : undefined, page: filter.page ?? 1, page_size: ADMIN_PAGE_SIZE})}`,
    pagedPayload(creditScoreSchema),
    {fallback: "供给方信用读取失败", fetchImplementation},
  );
}

/** GET /admin/supplier-credits/:id — recomputed on read; 40400 when the supplier has no managed node. */
export function fetchSupplierCredit(supplierId: number, fetchImplementation?: typeof fetch) {
  z.number().int().positive().parse(supplierId);
  return requestEnvelope(`${BASE}/supplier-credits/${supplierId}`, creditDetailSchema, {
    fallback: "供给方信用详情读取失败",
    fetchImplementation,
  });
}

/** PUT /admin/supplier-credits/:id/override `{mode, reason}`; allow/stop need a reason (≤254 chars). */
export function overrideSupplierCredit(
  supplierId: number,
  mode: CreditOverrideMode,
  reason: string,
  fetchImplementation?: typeof fetch,
) {
  z.number().int().positive().parse(supplierId);
  const trimmed = reason.trim();
  if (mode !== "auto" && !trimmed) return Promise.reject(new Error("强制放行或停调度必须填写理由"));
  if ([...trimmed].length > 254) return Promise.reject(new Error("理由不超过 254 字"));
  return requestEnvelope(`${BASE}/supplier-credits/${supplierId}/override`, creditDetailSchema, {
    fallback: "信用覆盖失败",
    init: jsonInit("PUT", trimmed ? {mode, reason: trimmed} : {mode}),
    fetchImplementation,
  });
}

export const partialRefundStatuses = ["pending", "processing", "success", "failed"] as const;
export const partialRefundStatusCopy: Record<(typeof partialRefundStatuses)[number], string> = {
  pending: "待提交",
  processing: "退款中",
  success: "已退款",
  failed: "失败（1 小时后自动重提）",
};
export const partialRefundKindCopy: Record<string, string> = {
  outage_compensation: "停机补偿退费",
  supplier_breach: "供给方违约退款",
};

export const partialRefundSchema = z.object({
  id: z.number().int().positive(),
  payment_id: z.number().int().positive(),
  order_no: z.string(),
  refund_request_id: z.string(),
  amount: z.number().int(),
  kind: z.string(),
  source_id: z.number().int().nullable(),
  reason: z.string().nullable(),
  status: z.enum(partialRefundStatuses),
  yeepay_refund_no: z.string().nullable(),
  last_error: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type PartialRefund = z.infer<typeof partialRefundSchema>;

/** GET /admin/payment/partial-refunds?status=&order_no= */
export function fetchPartialRefunds(filter: {status?: string; order_no?: string; page?: number}, fetchImplementation?: typeof fetch) {
  return requestEnvelope(
    `${BASE}/payment/partial-refunds${query({status: filter.status, order_no: filter.order_no, page: filter.page ?? 1, page_size: ADMIN_PAGE_SIZE})}`,
    pagedPayload(partialRefundSchema),
    {fallback: "部分退款记录读取失败", fetchImplementation},
  );
}

/**
 * POST /admin/supplier-breach-refunds `{order_no, reason}` (original managed order number). 50000 means the
 * partial-refund channel switch is off; 40900 covers threshold/term/renewal conflicts — messages shown verbatim.
 */
export function createSupplierBreachRefund(orderNo: string, reason: string, fetchImplementation?: typeof fetch) {
  const order = orderNo.trim();
  const text = reason.trim();
  if (!order) return Promise.reject(new Error("请填写原订单号"));
  if (!text) return Promise.reject(new Error("请填写违约原因"));
  return requestEnvelope(
    `${BASE}/supplier-breach-refunds`,
    z.object({
      order_no: z.string(),
      refund_order_no: z.string(),
      lease_no: z.string(),
      refund_id: z.number().int().positive(),
      amount: z.number().int(),
      access_until: z.string(),
    }),
    {fallback: "违约退款发起失败", init: jsonInit("POST", {order_no: order, reason: text}), fetchImplementation},
  );
}
