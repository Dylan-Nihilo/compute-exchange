import {z} from "zod";

import {jsonInit, requestEnvelope} from "./api/envelope.ts";
import {leaseStates, outageRemedies, type OutageRemedy} from "./domain/contracts.ts";

// Buyer-side managed rental endpoints (managed-rental-api.md "买家", fleet/access.go). All go
// through the allowlisted BFF route `/api/buyer/orders/:orderNo/[...action]`.

export {leaseStates};

export const leaseStateCopy: Record<string, string> = {
  reserved: "已预留",
  pending: "等待开通",
  provisioning: "平台开通中",
  active: "可登录",
  parked: "窗口外暂停",
  suspended: "已冻结",
  grace: "宽限期（已停机）",
  purging: "清除中",
  purged: "已清除",
  failed: "开通失败",
  cancelled: "已取消",
};

/** fleet.OrderAccess (GET /orders/:id/access). Never includes the node IP or container port. */
export const managedAccessSchema = z.object({
  gateway_host: z.string().min(1),
  gateway_port: z.number().int().positive(),
  // Login name = lease number (l-xxxxxxxx).
  login: z.string().min(1),
  lease_state: z.enum(leaseStates),
  access_until: z.string().nullable(),
  grace_until: z.string().nullable(),
  // Currently always ["publickey","password"].
  auth_methods: z.array(z.string()).nullable().transform((value) => value ?? []),
});
export type ManagedAccess = z.infer<typeof managedAccessSchema>;

/** fleet.AccessSession as returned to the buyer (buyer_id is operator-only and omitted). */
export const accessSessionSchema = z.object({
  id: z.number().int().positive(),
  lease_no: z.string(),
  remote_ip: z.string(),
  auth_method: z.string(),
  key_fingerprint: z.string().nullable(),
  key_name: z.string().nullable(),
  started_at: z.string(),
  ended_at: z.string().nullable(),
  bytes_up: z.number().int().nonnegative(),
  bytes_down: z.number().int().nonnegative(),
  end_reason: z.string().nullable(),
});
export type AccessSession = z.infer<typeof accessSessionSchema>;

const sessionsPageSchema = z.object({
  list: z.array(accessSessionSchema).nullable().transform((value) => value ?? []),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
});
export type AccessSessionsPage = z.infer<typeof sessionsPageSchema>;

/** Lease-level outage remedy copy; used by the operator lease table (`leases.outage_remedy`). */
export const remedyCopy: Record<OutageRemedy, string> = {extend: "顺延时长", refund: "退还费用"};

/** fleet outage causes (managed-rental-api.md "停机认定与补偿"); unknown values fall back to the raw code. */
export const outageCauseCopy: Record<string, string> = {
  node_offline: "节点离线",
  full_probe_failed: "节点复检未通过",
  gpu_fault: "GPU 故障",
  container_down: "环境异常停止",
  gateway_down: "访问网关异常",
  wrong_freeze: "误冻结",
  provision_delay: "开通延迟",
  night_unpark_failed: "窗口恢复失败",
};
export const outageLiableCopy: Record<string, string> = {supplier: "供给方", platform: "平台"};

/** fleet.BuyerOutage. `counted=null` = not settled yet; `counted=false` = under the minimum or overlapping. */
export const buyerOutageSchema = z.object({
  id: z.number().int().positive(),
  cause: z.string(),
  liable: z.string(),
  started_at: z.string(),
  ended_at: z.string().nullable(),
  ongoing: z.boolean(),
  minutes: z.number().int().nonnegative(),
  counted: z.boolean().nullable(),
  remedy: z.enum(outageRemedies).nullable(),
  remedy_applied_at: z.string().nullable(),
  // Fen; only set for remedy=refund.
  remedy_amount: z.number().int().nonnegative().nullable(),
});
export type BuyerOutage = z.infer<typeof buyerOutageSchema>;

/** fleet.OrderOutages (GET /orders/:id/outages, also the PUT .../outage-remedy response). */
export const orderOutagesSchema = z.object({
  order_no: z.string(),
  lease_no: z.string(),
  lease_state: z.enum(leaseStates),
  access_until: z.string().nullable(),
  remedy: z.enum(outageRemedies),
  refund_requested_at: z.string().nullable(),
  can_change_remedy: z.boolean(),
  refund_eligible: z.boolean(),
  refund_available: z.boolean(),
  term_minutes: z.number().int().nonnegative(),
  term_outage_minutes: z.number().int().nonnegative(),
  longest_outage_minutes: z.number().int().nonnegative(),
  refund_ratio: z.number().nonnegative(),
  refund_single_hours: z.number().int().nonnegative(),
  extended_minutes: z.number().int().nonnegative(),
  // Fen.
  pending_refund_amount: z.number().int().nonnegative(),
  items: z.array(buyerOutageSchema).nullable().transform((value) => value ?? []),
});
export type OrderOutages = z.infer<typeof orderOutagesSchema>;

function orderPath(orderNo: string, action: string) {
  return `/api/buyer/orders/${encodeURIComponent(orderNo)}/${action}`;
}

/**
 * 40400 covers both "该订单为人工交付, 没有网关连接信息" and "订单尚无租约"; 40300 "无权查看该订单".
 * The backend message is shown unchanged.
 */
export function fetchManagedAccess(orderNo: string, fetchImplementation?: typeof fetch) {
  return requestEnvelope(orderPath(orderNo, "access"), managedAccessSchema, {fallback: "连接信息读取失败", fetchImplementation});
}

/** Same ownership errors as /access (40400 manual order / no lease, 40300 not yours). */
export function fetchOrderOutages(orderNo: string, fetchImplementation?: typeof fetch) {
  return requestEnvelope(orderPath(orderNo, "outages"), orderOutagesSchema, {fallback: "停机记录读取失败", fetchImplementation});
}

/**
 * PUT /orders/:id/outage-remedy. While the Yeepay partial-refund switch is off, `refund` returns
 * 50000 "易宝部分退款能力未确认…" after recording `refund_requested_at`; callers show that message.
 */
export function setOutageRemedy(orderNo: string, remedy: OutageRemedy, fetchImplementation?: typeof fetch) {
  return requestEnvelope(orderPath(orderNo, "outage-remedy"), orderOutagesSchema, {
    fallback: "补偿方式修改失败",
    init: jsonInit("PUT", {remedy}),
    fetchImplementation,
  });
}

/** Threshold copy for the refund option, from the backend-provided parameters. */
export function refundThresholdText(outages: Pick<OrderOutages, "refund_ratio" | "refund_single_hours">) {
  const percent = Math.round(outages.refund_ratio * 1000) / 10;
  return `本期累计停机 ≥ 租期的 ${percent}% 或单次停机 ≥ ${outages.refund_single_hours} 小时`;
}

/** Buyer-facing status of one outage segment. */
export function outageItemStatus(item: Pick<BuyerOutage, "ongoing" | "counted" | "remedy" | "remedy_applied_at">) {
  if (item.ongoing) return "进行中";
  if (item.counted === null) return "待结算";
  if (item.counted === false) return "不足起算时长，不补偿";
  if (item.remedy === "extend") return "已顺延";
  if (item.remedy === "refund") return item.remedy_applied_at ? "已退费" : "待退费";
  return "已结算";
}

export const SESSIONS_PAGE_SIZE = 20;

/** GET /orders/:id/sessions?page&page_size, newest first; page_size is capped at 100 by the backend. */
export function fetchAccessSessions(
  orderNo: string,
  page = 1,
  fetchImplementation?: typeof fetch,
  pageSize = SESSIONS_PAGE_SIZE,
) {
  const params = new URLSearchParams({
    page: String(Math.max(1, Math.trunc(page))),
    page_size: String(Math.min(100, Math.max(1, Math.trunc(pageSize)))),
  });
  return requestEnvelope(`${orderPath(orderNo, "sessions")}?${params}`, sessionsPageSchema, {
    fallback: "会话记录读取失败",
    fetchImplementation,
  });
}

export function sshCommand(access: Pick<ManagedAccess, "gateway_host" | "gateway_port" | "login">) {
  const port = access.gateway_port === 22 ? "" : `-p ${access.gateway_port} `;
  return `ssh ${port}${access.login}@${access.gateway_host}`;
}

export function scpCommand(access: Pick<ManagedAccess, "gateway_host" | "gateway_port" | "login">) {
  const port = access.gateway_port === 22 ? "" : `-P ${access.gateway_port} `;
  return `scp ${port}<本地文件> ${access.login}@${access.gateway_host}:/root/workspace/`;
}

export function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)));
  const amount = value / 1024 ** exponent;
  return `${amount >= 100 || exponent === 0 ? Math.round(amount) : amount.toFixed(1)} ${units[exponent]}`;
}

const cny = new Intl.NumberFormat("zh-CN", {style: "currency", currency: "CNY"});
/** Fen → "¥12.34". */
export function formatFen(fen: number) {
  return cny.format(fen / 100);
}

/** Minutes → "2 小时 5 分钟" / "45 分钟". */
export function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} 小时 ${rest} 分钟` : `${hours} 小时`;
}
