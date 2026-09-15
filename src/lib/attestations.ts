import {z} from "zod";

import {createApiClient} from "./api/client.ts";

export const attestationTypes = {order: "订单创建", delivery: "交付确认", violation: "风控处置"} as const;
export type AttestationType = keyof typeof attestationTypes;
const recordSchema = z.object({
  data_hash: z.string(), chain_tx_id: z.string().nullable(), chain_status: z.string(),
  attempts: z.number().int().nonnegative(), last_error: z.string().nullable().optional(),
  created_at: z.string(), confirmed_at: z.string().nullable(),
});
const verificationSchema = z.object({
  verified: z.boolean(), data_hash: z.string(), tx_id: z.string(), chain_status: z.string(),
  db_hash_match: z.boolean().nullish(), chain_timestamp: z.string(), verify_url: z.string(), note: z.string().optional(),
});
export type Verification = z.infer<typeof verificationSchema>;

async function request(path: string, method: "GET" | "POST", fetchImplementation: typeof fetch) {
  const response = await createApiClient({baseUrl: "/api", fetchImplementation}).request(path,
    z.object({code: z.number(), message: z.string().optional(), data: z.unknown().optional()}),
    {method, cache: "no-store"});
  if (response.code !== 0) throw new Error(response.message || "存证请求失败");
  return response.data;
}

export async function fetchAttestation(type: AttestationType, id: string, fetchImplementation = fetch) {
  const data = await request(`/v1/blockchain/attestations/${type}/${encodeURIComponent(id)}`, "GET", fetchImplementation);
  return data == null ? null : recordSchema.parse(data);
}

export async function verifyAttestation(type: AttestationType, id: string, fetchImplementation = fetch) {
  return verificationSchema.parse(await request(`/v1/blockchain/verify?${new URLSearchParams({type, id})}`, "GET", fetchImplementation));
}

export async function requeueFailedAttestations(fetchImplementation = fetch) {
  return z.strictObject({requeued: z.number().int().nonnegative()}).parse(await request("/admin/blockchain/requeue-failed", "POST", fetchImplementation)).requeued;
}

export function isAttestationVerified(result: Verification) {
  return result.verified && result.db_hash_match === true && result.chain_status === "confirmed"
    && /^0x[0-9a-f]{64}$/i.test(result.data_hash) && result.tx_id.trim().length > 0;
}

export function explorerURL(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

export function attestationStatus(status: string) {
  return ({pending: "待上链", confirmed: "已上链", failed: "上链失败"} as Record<string, string>)[status] ?? "状态待确认";
}
