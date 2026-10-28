import {z, type ZodType} from "zod";

import {jsonInit, requestEnvelope} from "./api/envelope.ts";
import {leaseStates} from "./domain/contracts.ts";

// v1.2 operator views for managed rental (docs/25 §25.10 运营): node suspend/resume,
// lease search, gateway session audit and node tasks (fleet admin handlers).

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

export {leaseStates as adminLeaseStates} from "./domain/contracts.ts";

/** Fleet admin list endpoints use response.SuccessPage; page_size defaults to 20 and caps at 100. */
export const ADMIN_PAGE_SIZE = 20;

const nullableId = z.number().int().positive().nullable();

/** fleet.Lease as returned by GET /admin/leases (lease.go). There is no order_no or node name. */
export const adminLeaseSchema = z.object({
  id: z.number().int().positive(),
  lease_no: z.string(),
  order_id: z.number().int().positive(),
  buyer_id: z.number().int().positive(),
  product_id: z.number().int().positive(),
  node_id: z.number().int().positive(),
  cards: z.number().int().positive(),
  delivery_kind: z.enum(["container", "bare_metal"]),
  state: z.enum(leaseStates),
  upstream_port: z.number().int().nullable(),
  upstream_host_key_fp: z.string().nullable(),
  container_name: z.string().nullable(),
  volume_name: z.string().nullable(),
  access_until: z.string().nullable(),
  access_changed_at: z.string(),
  grace_until: z.string().nullable(),
  provisioned_at: z.string().nullable(),
  purged_at: z.string().nullable(),
  fail_reason: z.string().nullable(),
  resource_alert: z.string().nullable(),
  // DB ENUM('extend','refund') NOT NULL DEFAULT 'extend'; the buyer choice endpoint (T-105) is not open yet.
  outage_remedy: z.enum(["extend", "refund"]),
  created_at: z.string(),
  updated_at: z.string(),
});
export type AdminLease = z.infer<typeof adminLeaseSchema>;

export const deliveryKindCopy: Record<AdminLease["delivery_kind"], string> = {container: "容器", bare_metal: "整机"};

export type LeaseFilter = {state?: string; node_id?: string; buyer_id?: string; page?: number};

export function fetchAdminLeases(filter: LeaseFilter, fetchImplementation?: typeof fetch) {
  return requestEnvelope(
    `${BASE}/leases${query({...filter, page: filter.page ?? 1, page_size: ADMIN_PAGE_SIZE})}`,
    pagedPayload(adminLeaseSchema),
    {fallback: "租约读取失败", fetchImplementation},
  );
}

/** fleet.AccessSession; the admin search additionally carries `buyer_id` (access.go). */
export const adminSessionSchema = z.object({
  id: z.number().int().positive(),
  lease_no: z.string(),
  buyer_id: z.number().int().positive(),
  remote_ip: z.string(),
  auth_method: z.string(),
  key_fingerprint: z.string().nullable(),
  // Name the buyer gave the key at the time (kept even if the key was deleted later).
  key_name: z.string().nullable(),
  started_at: z.string(),
  ended_at: z.string().nullable(),
  bytes_up: z.number().int().nonnegative(),
  bytes_down: z.number().int().nonnegative(),
  end_reason: z.string().nullable(),
});
export type AdminSession = z.infer<typeof adminSessionSchema>;

const leaseNoPattern = /^l-[a-z2-7]{8}$/;

/** Backend rejects malformed lease_no / ip with 40001; the lease_no format is checked here first. */
export function fetchAdminSessions(filter: {lease_no?: string; ip?: string; page?: number}, fetchImplementation?: typeof fetch) {
  const leaseNo = filter.lease_no?.trim() ?? "";
  if (leaseNo && !leaseNoPattern.test(leaseNo)) {
    return Promise.reject(new Error("租约号格式应为 l- 加 8 位小写字母或数字 2-7"));
  }
  return requestEnvelope(
    `${BASE}/access-sessions${query({lease_no: leaseNo, ip: filter.ip, page: filter.page ?? 1, page_size: ADMIN_PAGE_SIZE})}`,
    pagedPayload(adminSessionSchema),
    {fallback: "会话记录读取失败", fetchImplementation},
  );
}

export const nodeTaskStates = ["pending", "running", "succeeded", "failed", "dead"] as const;
export type NodeTaskState = (typeof nodeTaskStates)[number];

export const nodeTaskStateCopy: Record<NodeTaskState, string> = {
  pending: "排队中",
  running: "执行中",
  succeeded: "已成功",
  failed: "失败待重试",
  dead: "死信",
};

/** fleet.Task (model.go). payload/result are free-form JSON (null when absent). */
export const nodeTaskSchema = z.object({
  id: z.number().int().positive(),
  node_id: z.number().int().positive(),
  lease_id: nullableId,
  deployment_id: nullableId,
  kind: z.string(),
  state: z.enum(nodeTaskStates),
  priority: z.number().int(),
  attempts: z.number().int().nonnegative(),
  max_attempts: z.number().int().nonnegative(),
  run_after: z.string(),
  locked_until: z.string().nullable(),
  payload: z.unknown(),
  result: z.unknown(),
  last_error: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type NodeTask = z.infer<typeof nodeTaskSchema>;

export type NodeTaskFilter = {state?: NodeTaskState | ""; node_id?: string; page?: number};

/** GET /admin/node-tasks?state=&node_id=&page=&page_size= (state empty = all states). */
export function fetchNodeTasks(filter: NodeTaskFilter, fetchImplementation?: typeof fetch) {
  return requestEnvelope(
    `${BASE}/node-tasks${query({state: filter.state, node_id: filter.node_id, page: filter.page ?? 1, page_size: ADMIN_PAGE_SIZE})}`,
    pagedPayload(nodeTaskSchema),
    {fallback: "节点任务读取失败", fetchImplementation},
  );
}

/**
 * POST /admin/node-tasks/:id/retry → `{task_id, state:"pending"}`. Only `dead` non-provision tasks
 * can be retried; the backend's 40900 messages ("仅死信(dead)任务可重试…", provision 已自动善后,
 * "任务状态已变化…") are shown verbatim.
 */
export function retryNodeTask(taskId: number, fetchImplementation?: typeof fetch) {
  z.number().int().positive().parse(taskId);
  return requestEnvelope(
    `${BASE}/node-tasks/${taskId}/retry`,
    z.object({task_id: z.number().int().positive(), state: z.literal("pending")}),
    {fallback: "任务重试失败", init: jsonInit("POST"), fetchImplementation},
  );
}

/** Retry button availability, mirroring fleet RetryTask (provision dead letters are auto-remediated). */
export function canRetryNodeTask(task: Pick<NodeTask, "state" | "kind">) {
  return task.state === "dead" && task.kind !== "provision";
}

/** Task kinds the fleet worker runs today (model.go Kind*); unknown kinds fall back to the raw value. */
export const nodeTaskKindCopy: Record<string, string> = {
  probe: "探活",
  provision: "开通租约",
  kill_sessions: "断开会话",
  stop: "停止容器",
  purge: "清除租约",
};

/** Any non-suspended SSH node can be suspended; resume returns it to `unverified` and queues a full probe. */
export function suspensionAction(verifyStatus: string | undefined): "suspend" | "resume" | null {
  if (!verifyStatus) return null;
  return verifyStatus === "suspended" ? "resume" : "suspend";
}

// The global deployment view (docs/27 §27.8, GET /admin/deployments) has no backend route yet
// (T-098/099); the admin page renders a static "not yet available" state instead of calling it.
