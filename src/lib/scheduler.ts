import {z} from "zod";

import {createApiClient} from "./api/client.ts";
import {nodeVerifyStatuses} from "./domain/contracts.ts";

export const nodeStatuses = {online: "在线", degraded: "负载高或余量不足", offline: "离线"} as const;
const managedExtraSchema = z.object({
  last_probe: z.object({
    id: z.number().int().positive(), kind: z.string(), result: z.enum(["pass", "fail"]),
    failed_checks: z.array(z.string()).nullable().transform((value) => value ?? []), created_at: z.string(),
  }).nullable(),
  slots: z.record(z.string(), z.number().int().nonnegative()).nullable().transform((value) => value ?? {}),
  ssh_host: z.string().nullable(),
  ssh_port: z.number().int().nullable(),
  host_key_fingerprint: z.string().nullable(),
  host_key_confirmed: z.boolean(),
});
export type ManagedNodeExtra = z.infer<typeof managedExtraSchema>;
const nodeSchema = z.object({
  supplier_name: z.string().optional(),
  id: z.number().int().positive(), supplier_id: z.number().int().positive(), product_id: z.number().int().positive(),
  node_name: z.string(), status: z.enum(["online", "degraded", "offline"]),
  total_cards: z.number().int().nonnegative(), available_cards: z.number().int().nonnegative(),
  gpu_util_pct: z.number().nullable(), vram_util_pct: z.number().nullable(), last_heartbeat_at: z.string().nullable(),
  // v1.2 (scheduler Node, migration 026): the list carries only these managed columns. SSH host and
  // host-key state are NOT in the list; the supplier wizard reads GET /supplier/nodes/:id/onboarding.
  mgmt_mode: z.enum(["push", "ssh"]).optional(),
  verify_status: z.enum(nodeVerifyStatuses).optional(),
  schedulable: z.union([z.boolean(), z.number().int()]).transform((value) => Boolean(value)).optional(),
  // Operator list only (GET /admin/nodes, fleet.ManagedExtra); absent for push nodes or when fleet is disabled.
  managed: managedExtraSchema.optional(),
});
export type ComputeNode = z.infer<typeof nodeSchema>;
const adviceSchema = z.object({
  order_no: z.string(), product_id: z.number().int().positive(), need_cards: z.number().int().positive(), summary: z.string(), generated_at: z.string(),
  nodes: z.array(z.object({node_id: z.number().int().positive(), node_name: z.string(), status: nodeSchema.shape.status,
    available_cards: z.number().int().nonnegative(), total_cards: z.number().int().nonnegative(), score: z.number(),
    verdict: z.enum(["recommended", "alternative", "unavailable"]), reasons: z.array(z.string()).nullable().transform((value) => value ?? []),
    // heartbeat = node-reported available_cards (manual products); gpu_slots = computed from card slots (managed).
    capacity_source: z.enum(["heartbeat", "gpu_slots"]).optional(),
    // Largest free-card count within one topology group (fragmentation); null for manual products.
    max_group_free: z.number().int().nonnegative().nullable().optional()})).nullable().transform((value) => value ?? []),
});
export const nodeRegistrationInput = z.object({
  product_id: z.number().int().positive(), node_name: z.string().trim().min(1).max(64), total_cards: z.number().int().min(1).max(2147483647),
  // v1.2: managed products register SSH-managed nodes (docs/25 §25.10); omitted for push nodes.
  mgmt_mode: z.literal("ssh").optional(),
  // Required (≥1) for container delivery; 0 is allowed for bare-metal managed products (fleet RegisterManagedNode).
  disk_per_card_gb: z.number().int().min(0).max(100_000).optional(),
  lease_port_start: z.number().int().min(1024).max(65535).optional(),
  lease_port_end: z.number().int().min(1024).max(65535).optional(),
  // Recommended for SSH nodes: pins the host key before the first connection (docs/25 §25.4.2).
  expected_host_fingerprint: z.string().trim().regex(/^SHA256:[A-Za-z0-9+/]{43}$/, "主机指纹格式应为 SHA256: 加 43 位字符").optional(),
}).refine((input) => (input.lease_port_start == null) === (input.lease_port_end == null)
  && (input.lease_port_start == null || input.lease_port_start <= input.lease_port_end!), {message: "租约端口段无效", path: ["lease_port_end"]});
export type NodeRegistrationInput = z.infer<typeof nodeRegistrationInput>;

async function request(path: string, fetchImplementation: typeof fetch, options: {method?: string; json?: unknown} = {}) {
  const result = await createApiClient({baseUrl: "/api", fetchImplementation}).request(path,
    z.object({code: z.number(), message: z.string().optional(), data: z.unknown().optional()}), {cache: "no-store", ...options});
  if (result.code !== 0) throw new Error(result.message || "节点服务请求失败");
  return result.data;
}

export async function fetchSupplierNodes(fetchImplementation = fetch) {
  return z.array(nodeSchema).nullable().parse(await request("/supplier/nodes", fetchImplementation)) ?? [];
}

export async function registerNode(input: NodeRegistrationInput, fetchImplementation = fetch) {
  const parsed = nodeRegistrationInput.parse(input);
  const node = z.object({id: z.number().int().positive()});
  const data = await request("/supplier/nodes", fetchImplementation, {method: "POST", json: parsed});
  // SSH nodes respond `{node}` only (no push key, node_key_hash NULL); push nodes respond `{node, node_key, notice}`.
  if (parsed.mgmt_mode === "ssh") return {...z.object({node}).parse(data), node_key: null};
  return z.object({node, node_key: z.string().regex(/^nk-[0-9a-f]{64}$/)}).parse(data);
}

export function isManagedNode(node: Pick<ComputeNode, "mgmt_mode">) {
  return node.mgmt_mode === "ssh";
}

export async function deleteNode(id: number, fetchImplementation = fetch) {
  z.number().int().positive().parse(id);
  return z.object({deleted: z.literal(true)}).parse(await request(`/supplier/nodes/${id}`, fetchImplementation, {method: "DELETE"}));
}

export async function fetchAdminNodes(status: string, page: number, fetchImplementation = fetch) {
  z.enum(["", "online", "degraded", "offline"]).parse(status);
  z.number().int().positive().parse(page);
  const query = new URLSearchParams({page: String(page), page_size: "20"});
  if (status) query.set("status", status);
  return z.object({list: z.array(nodeSchema).nullable().transform((value) => value ?? []), total: z.number().int().nonnegative()}).parse(await request(`/admin/nodes?${query}`, fetchImplementation));
}

export async function fetchScheduleAdvice(role: "supplier" | "admin", orderNo: string, fetchImplementation = fetch) {
  return adviceSchema.parse(await request(`/${role}/schedule-advice?${new URLSearchParams({order_no: orderNo})}`, fetchImplementation));
}
