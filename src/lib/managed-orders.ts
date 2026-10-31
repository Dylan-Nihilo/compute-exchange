import {z} from "zod";

import {jsonInit, requestEnvelope} from "./api/envelope.ts";
import {leaseStates, outageRemedies, type OutageRemedy} from "./domain/contracts.ts";
import {formatDateTime} from "./format/date.ts";

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
  // fleet/access.go:248 (integ 2a97d7c): container = per-card lease container, bare_metal = whole host
  // (host account omnis-<login>, no one-click deploy). Optional so an older backend still parses.
  delivery_kind: z.enum(["container", "bare_metal"]).optional(),
});
export type ManagedAccess = z.infer<typeof managedAccessSchema>;

/**
 * Bare-metal detection: the lease's own `delivery_kind` wins; the product's `delivery_mode` is only a
 * fallback while /access is unavailable or comes from a backend that does not send the field yet.
 */
export function isBareMetalLease(access: Pick<ManagedAccess, "delivery_kind"> | undefined | null, productDeliveryMode?: string | null) {
  if (access?.delivery_kind) return access.delivery_kind === "bare_metal";
  return productDeliveryMode === "bare_metal";
}

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

type AccessTiming = Pick<ManagedAccess, "lease_state" | "access_until" | "grace_until">;

/**
 * Why a managed lease cannot be logged into right now (docs/api/page-api-map.md 托管订单, T-087/088/089).
 * Bare-metal leases have no grace period: expiry goes straight to purge.
 */
export function inactiveHint(access: AccessTiming, bareMetal = false) {
  const state = access.lease_state;
  if (state === "pending" || state === "provisioning" || state === "reserved") return "平台正在开通资源，自检通过后即可登录，开通耗时不计入租期。";
  if (state === "grace") {
    if (bareMetal) return "租期已结束，访问已停止，整机数据将被清除。";
    const until = access.grace_until ? `宽限期至 ${formatDateTime(access.grace_until)}，` : "";
    return `租期已结束，访问已停止；${until}期间续租可在原节点恢复原环境与数据，逾期清除数据。`;
  }
  if (state === "parked") return "当前不在包夜窗口内，窗口开始后自动恢复。";
  if (state === "suspended") return "订单已冻结，暂停登录；容器与数据保留，请联系客服。";
  if (state === "purging") return "租期已结束，平台正在清除数据，清除后不可恢复。";
  if (state === "purged") return bareMetal ? "租期已结束，整机数据已清除。续租将重新分配整机。" : "租期已结束，数据已清除。续租将重新分配资源。";
  if (state === "failed") return "开通失败，订单将自动取消并原路退款，以订单状态为准。";
  if (state === "cancelled") return "租约已取消。";
  return "当前租约不可登录。";
}

const EXPIRY_WARN_MS = 24 * 3600 * 1000;

/** Reminder shown while an active lease is within 24h of `access_until`; null otherwise. */
export function expiryReminder(access: AccessTiming, bareMetal = false, now = Date.now()) {
  if (access.lease_state !== "active" || !access.access_until) return null;
  const left = Date.parse(access.access_until) - now;
  if (!Number.isFinite(left) || left <= 0 || left > EXPIRY_WARN_MS) return null;
  const when = formatDateTime(access.access_until);
  return bareMetal
    ? `租期将于 ${when} 结束，到期即断开并清除整机数据，请提前导出数据或续租。`
    : `租期将于 ${when} 结束，到期后进入宽限期并停止访问；如需继续使用请提前续租。`;
}
