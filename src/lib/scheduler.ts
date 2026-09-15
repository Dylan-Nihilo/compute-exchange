import {z} from "zod";

import {createApiClient} from "./api/client.ts";

export const nodeStatuses = {online: "在线", degraded: "负载高或余量不足", offline: "离线"} as const;
const nodeSchema = z.object({
  supplier_name: z.string().optional(),
  id: z.number().int().positive(), supplier_id: z.number().int().positive(), product_id: z.number().int().positive(),
  node_name: z.string(), status: z.enum(["online", "degraded", "offline"]),
  total_cards: z.number().int().nonnegative(), available_cards: z.number().int().nonnegative(),
  gpu_util_pct: z.number().nullable(), vram_util_pct: z.number().nullable(), last_heartbeat_at: z.string().nullable(),
});
export type ComputeNode = z.infer<typeof nodeSchema>;
const adviceSchema = z.object({
  order_no: z.string(), product_id: z.number().int().positive(), need_cards: z.number().int().positive(), summary: z.string(), generated_at: z.string(),
  nodes: z.array(z.object({node_id: z.number().int().positive(), node_name: z.string(), status: nodeSchema.shape.status,
    available_cards: z.number().int().nonnegative(), total_cards: z.number().int().nonnegative(), score: z.number(),
    verdict: z.enum(["recommended", "alternative", "unavailable"]), reasons: z.array(z.string())})).nullable().transform((value) => value ?? []),
});
export const nodeRegistrationInput = z.object({product_id: z.number().int().positive(), node_name: z.string().trim().min(1).max(64), total_cards: z.number().int().min(1).max(2147483647)});
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
  return z.object({node: z.object({id: z.number().int().positive()}), node_key: z.string().regex(/^nk-[0-9a-f]{64}$/)}).parse(
    await request("/supplier/nodes", fetchImplementation, {method: "POST", json: nodeRegistrationInput.parse(input)}));
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
