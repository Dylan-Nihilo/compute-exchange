import {z} from "zod";

import {jsonInit, listPayload, requestEnvelope} from "./api/envelope.ts";

// Buyer-side managed rental endpoints (docs/25 §25.10 "买家"). All go through the
// allowlisted BFF route `/api/buyer/orders/:orderNo/[...action]`.

export const leaseStates = [
  "reserved", "pending", "provisioning", "active", "parked", "suspended",
  "grace", "purging", "purged", "failed", "cancelled",
] as const;

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

/** `auth_methods` is documented without a type; accept an array or a comma separated string. */
const authMethodsSchema = z
  .union([z.array(z.string()), z.string(), z.null(), z.undefined()])
  .transform((value) => (Array.isArray(value) ? value : (value ?? "").split(",")).map((item) => item.trim()).filter(Boolean));

export const managedAccessSchema = z.object({
  gateway_host: z.string().min(1),
  gateway_port: z.coerce.number().int().positive(),
  login: z.string().min(1),
  lease_state: z.string(),
  access_until: z.string().nullable().optional(),
  grace_until: z.string().nullable().optional(),
  auth_methods: authMethodsSchema,
  // Not in the documented response; shown only when the backend sends it (leases.resource_alert).
  resource_alert: z.string().nullable().optional(),
  outage_remedy: z.enum(["extend", "refund"]).nullable().optional(),
});
export type ManagedAccess = z.infer<typeof managedAccessSchema>;

export const accessSessionSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  gw_session_id: z.string().optional(),
  remote_ip: z.string(),
  auth_method: z.string(),
  key_fingerprint: z.string().nullable().optional(),
  started_at: z.string(),
  ended_at: z.string().nullable().optional(),
  bytes_up: z.coerce.number().nonnegative().optional().default(0),
  bytes_down: z.coerce.number().nonnegative().optional().default(0),
  end_reason: z.string().nullable().optional(),
});
export type AccessSession = z.infer<typeof accessSessionSchema>;

export const outageRemedies = ["extend", "refund"] as const;
export type OutageRemedy = (typeof outageRemedies)[number];

export const leaseOutageSchema = z.object({
  id: z.union([z.number(), z.string()]),
  cause: z.string(),
  liable: z.string(),
  started_at: z.string(),
  ended_at: z.string().nullable().optional(),
  minutes: z.number().int().nonnegative().nullable().optional(),
  remedy: z.enum(outageRemedies).nullable().optional(),
  remedy_applied_at: z.string().nullable().optional(),
  remedy_amount: z.number().int().nonnegative().nullable().optional(),
});
export type LeaseOutage = z.infer<typeof leaseOutageSchema>;

/**
 * The outages response shape is not pinned down in docs/25; accept a bare list or
 * `{list, outage_remedy}` where `outage_remedy` is the lease-level choice.
 */
const outagesPayloadSchema = z
  .union([
    z.array(leaseOutageSchema),
    z.object({list: z.array(leaseOutageSchema).nullable(), outage_remedy: z.enum(outageRemedies).nullable().optional()}),
    z.null(),
    z.undefined(),
  ])
  .transform((value) => {
    if (Array.isArray(value)) return {outages: value, remedy: null};
    return {outages: value?.list ?? [], remedy: value?.outage_remedy ?? null};
  });

export const outageCauseCopy: Record<string, string> = {
  node_offline: "节点离线",
  gpu_fault: "GPU 故障",
  container_down: "容器异常退出",
  full_probe_failed: "完整探活未通过",
  night_unpark_failed: "包夜窗口未能开通",
  provision_delay: "开通延迟",
  gateway_down: "访问网关不可用",
  wrong_freeze: "误冻结",
};

export const liableCopy: Record<string, string> = {supplier: "供给方", platform: "平台"};
export const remedyCopy: Record<OutageRemedy, string> = {extend: "顺延时长", refund: "退还费用"};

function orderPath(orderNo: string, action: string) {
  return `/api/buyer/orders/${encodeURIComponent(orderNo)}/${action}`;
}

export function fetchManagedAccess(orderNo: string, fetchImplementation?: typeof fetch) {
  return requestEnvelope(orderPath(orderNo, "access"), managedAccessSchema, {fallback: "连接信息读取失败", fetchImplementation});
}

export function fetchAccessSessions(orderNo: string, fetchImplementation?: typeof fetch) {
  return requestEnvelope(orderPath(orderNo, "sessions"), listPayload(accessSessionSchema), {fallback: "会话记录读取失败", fetchImplementation});
}

export function fetchLeaseOutages(orderNo: string, fetchImplementation?: typeof fetch) {
  return requestEnvelope(orderPath(orderNo, "outages"), outagesPayloadSchema, {fallback: "停机记录读取失败", fetchImplementation});
}

/**
 * PUT /orders/:id/outage-remedy. A 50000 for `refund` (Yeepay partial refund not confirmed)
 * or 40900 after the lease ended is thrown with the backend message unchanged.
 */
export function setOutageRemedy(orderNo: string, remedy: OutageRemedy, fetchImplementation?: typeof fetch) {
  return requestEnvelope(orderPath(orderNo, "outage-remedy"), z.unknown(), {
    fallback: "补偿方式更新失败",
    init: jsonInit("PUT", {remedy}),
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

/** Remedy choice is only meaningful while the lease is still running (40900 afterwards). */
export function canChooseRemedy(leaseState: string | undefined) {
  return leaseState === "active" || leaseState === "parked" || leaseState === "suspended";
}
