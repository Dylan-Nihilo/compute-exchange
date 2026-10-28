import {z, type ZodType} from "zod";

import {jsonInit, requestEnvelope} from "./api/envelope.ts";

// v1.2 operator views for managed rental (docs/25 §25.10 运营): node suspend/resume,
// lease search, gateway session audit and dead node tasks.

const BASE = "/api/admin";

/** Bare array, `{list,total}` or null; `total` falls back to the row count when absent. */
export function pagedPayload<T extends ZodType>(item: T) {
  return z
    .union([z.array(item), z.object({list: z.array(item).nullable(), total: z.number().int().nonnegative().optional()}), z.null()])
    .transform((value): {list: z.infer<T>[]; total: number} => {
      if (value === null) return {list: [], total: 0};
      if (Array.isArray(value)) return {list: value, total: value.length};
      const list = value.list ?? [];
      return {list, total: value.total ?? list.length};
    });
}

function query(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const text = value == null ? "" : String(value).trim();
    if (text) search.set(key, text);
  }
  return search.size ? `?${search}` : "";
}

/**
 * POST /admin/nodes/:id/suspend `{reason?≤200}` → `{verify_status:"suspended"}`;
 * POST /admin/nodes/:id/resume → `{verify_status:"unverified", task_id}` (a full probe is queued).
 */
export function changeNodeSuspension(
  nodeId: number,
  action: "suspend" | "resume",
  fetchImplementation?: typeof fetch,
  reason = "",
) {
  z.number().int().positive().parse(nodeId);
  const trimmed = reason.trim();
  if ([...trimmed].length > 200) throw new Error("停用原因不超过 200 字");
  return requestEnvelope(
    `${BASE}/nodes/${nodeId}/${action}`,
    // Union keeps one schema type; resume carries the queued probe task.
    z.union([
      z.object({verify_status: z.literal("suspended")}),
      z.object({verify_status: z.literal("unverified"), task_id: z.number().int().nonnegative()}),
    ]),
    {
      fallback: action === "suspend" ? "停用节点失败" : "恢复节点失败",
      init: action === "suspend" && trimmed ? jsonInit("POST", {reason: trimmed}) : jsonInit("POST"),
      fetchImplementation,
    },
  );
}

export const adminLeaseStates = ["reserved", "pending", "provisioning", "active", "parked", "suspended", "grace", "purging", "purged", "failed", "cancelled"] as const;

export const adminLeaseSchema = z.object({
  id: z.number().int().positive(),
  lease_no: z.string(),
  order_id: z.number().int().positive().optional(),
  order_no: z.string().optional(),
  buyer_id: z.number().int().positive(),
  product_id: z.number().int().positive().optional(),
  node_id: z.number().int().positive(),
  node_name: z.string().optional(),
  cards: z.number().int().positive(),
  delivery_kind: z.string().optional(),
  state: z.string(),
  access_until: z.string().nullable().optional(),
  grace_until: z.string().nullable().optional(),
  provisioned_at: z.string().nullable().optional(),
  fail_reason: z.string().nullable().optional(),
  resource_alert: z.string().nullable().optional(),
  outage_remedy: z.enum(["extend", "refund"]).optional(),
  created_at: z.string().optional(),
});
export type AdminLease = z.infer<typeof adminLeaseSchema>;

export type LeaseFilter = {state?: string; node_id?: string; buyer_id?: string; page?: number};

export function fetchAdminLeases(filter: LeaseFilter, fetchImplementation?: typeof fetch) {
  return requestEnvelope(`${BASE}/leases${query({...filter, page_size: filter.page ? 20 : undefined})}`, pagedPayload(adminLeaseSchema), {
    fallback: "租约读取失败",
    fetchImplementation,
  });
}

export const adminSessionSchema = z.object({
  id: z.number().int().positive(),
  lease_id: z.number().int().positive().optional(),
  lease_no: z.string().optional(),
  gw_session_id: z.string().optional(),
  remote_ip: z.string(),
  auth_method: z.string(),
  key_fingerprint: z.string().nullable().optional(),
  started_at: z.string(),
  ended_at: z.string().nullable().optional(),
  bytes_up: z.coerce.number().nonnegative().optional(),
  bytes_down: z.coerce.number().nonnegative().optional(),
  end_reason: z.string().nullable().optional(),
});
export type AdminSession = z.infer<typeof adminSessionSchema>;

export function fetchAdminSessions(filter: {lease_no?: string; ip?: string; page?: number}, fetchImplementation?: typeof fetch) {
  return requestEnvelope(`${BASE}/access-sessions${query({...filter, page_size: filter.page ? 20 : undefined})}`, pagedPayload(adminSessionSchema), {
    fallback: "会话记录读取失败",
    fetchImplementation,
  });
}

export const nodeTaskSchema = z.object({
  id: z.number().int().positive(),
  node_id: z.number().int().positive(),
  lease_id: z.number().int().positive().nullable().optional(),
  deployment_id: z.number().int().positive().nullable().optional(),
  kind: z.string(),
  state: z.string(),
  attempts: z.number().int().nonnegative(),
  max_attempts: z.number().int().positive().optional(),
  last_error: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});
export type NodeTask = z.infer<typeof nodeTaskSchema>;

export function fetchDeadNodeTasks(fetchImplementation?: typeof fetch) {
  return requestEnvelope(`${BASE}/node-tasks?state=dead`, pagedPayload(nodeTaskSchema), {fallback: "死信任务读取失败", fetchImplementation});
}

export function retryNodeTask(taskId: number, fetchImplementation?: typeof fetch) {
  z.number().int().positive().parse(taskId);
  return requestEnvelope(`${BASE}/node-tasks/${taskId}/retry`, z.unknown(), {
    fallback: "任务重试失败",
    init: jsonInit("POST"),
    fetchImplementation,
  });
}

export const nodeTaskKindCopy: Record<string, string> = {
  probe: "探活",
  bootstrap_key: "下发管理密钥",
  apply_firewall: "端口放行",
  provision: "开通租约",
  selftest: "开通自检",
  park: "包夜暂停",
  unpark: "包夜恢复",
  kill_sessions: "断开会话",
  stop: "停止容器",
  purge: "清除租约",
  pull_model: "拉取模型",
  deploy_model: "部署模型",
  stop_model: "停止模型",
};

/** Any non-suspended SSH node can be suspended; resume returns it to `unverified` and queues a full probe. */
export function suspensionAction(verifyStatus: string | undefined): "suspend" | "resume" | null {
  if (!verifyStatus) return null;
  return verifyStatus === "suspended" ? "resume" : "suspend";
}

// Global deployment view (docs/27 §27.8 运营: GET /admin/deployments?state=&health=).
export const adminDeploymentSchema = z.object({
  id: z.number().int().positive().optional(),
  deploy_no: z.string().min(1),
  lease_id: z.number().int().positive().optional(),
  lease_no: z.string().optional(),
  order_id: z.number().int().positive().optional(),
  order_no: z.string().optional(),
  buyer_id: z.number().int().positive().optional(),
  node_id: z.number().int().positive().optional(),
  node_name: z.string().optional(),
  model_id: z.number().int().positive().optional(),
  model_key: z.string().optional(),
  display_name: z.string().optional(),
  tp: z.number().int().positive(),
  dp: z.number().int().positive(),
  max_model_len: z.number().int().positive(),
  state: z.string(),
  health: z.string().optional().default("unknown"),
  health_reason: z.string().nullable().optional(),
  restart_count: z.number().int().nonnegative().optional(),
  last_restart_at: z.string().nullable().optional(),
  fail_reason: z.string().nullable().optional(),
  started_at: z.string().nullable().optional(),
  created_at: z.string().optional(),
});
export type AdminDeployment = z.infer<typeof adminDeploymentSchema>;

export type DeploymentFilter = {state?: string; health?: string; page?: number};

export function fetchAdminDeployments(filter: DeploymentFilter, fetchImplementation?: typeof fetch) {
  return requestEnvelope(`${BASE}/deployments${query({...filter, page_size: filter.page ? 20 : undefined})}`, pagedPayload(adminDeploymentSchema), {
    fallback: "部署列表读取失败",
    fetchImplementation,
  });
}
