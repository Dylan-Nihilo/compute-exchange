import {z} from "zod";

import {requestEnvelope} from "./api/envelope.ts";
import {leaseStates, type OutageRemedy} from "./domain/contracts.ts";

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
