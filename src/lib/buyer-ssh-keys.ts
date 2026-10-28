import {z} from "zod";

import {jsonInit, listPayload, requestEnvelope} from "./api/envelope.ts";

// Buyer SSH public keys for the managed-rental gateway (docs/25 §25.6.1, §25.10).
// Keys apply to every managed lease the buyer owns; at most 10 per account (40900 beyond).

export const MAX_SSH_KEYS = 10;

export const sshKeySchema = z.object({
  id: z.union([z.number().int().positive(), z.string().min(1)]),
  name: z.string(),
  fingerprint: z.string(),
  public_key: z.string().optional(),
  created_at: z.string(),
  revoked_at: z.string().nullable().optional(),
});
export type SshKey = z.infer<typeof sshKeySchema>;

const KEY_TYPES = ["ssh-ed25519", "ecdsa-sha2-nistp256", "ecdsa-sha2-nistp384", "ecdsa-sha2-nistp521", "ssh-rsa"];

/**
 * Client-side shape check only. Strength (RSA ≥ 3072 bits) and the authoritative format
 * check are done by the backend, which answers 40001 with the reason.
 */
export const sshKeyInput = z.object({
  name: z.string().trim().min(1, "请填写名称").max(64, "名称最多 64 个字符"),
  public_key: z
    .string()
    .trim()
    .max(1024, "公钥过长（最多 1024 个字符）")
    .refine((value) => !/[\r\n]/.test(value), "一次只能添加一把公钥，请粘贴单行内容")
    .refine((value) => {
      const [type, body] = value.split(/\s+/);
      return KEY_TYPES.includes(type ?? "") && /^[A-Za-z0-9+/]+={0,3}$/.test(body ?? "");
    }, "仅支持 ssh-ed25519、ecdsa 或 3072 位以上的 ssh-rsa 公钥（.pub 文件内容）"),
});
export type SshKeyInput = z.infer<typeof sshKeyInput>;

export function activeSshKeys(keys: readonly SshKey[]) {
  return keys.filter((key) => !key.revoked_at);
}

export function fetchSshKeys(fetchImplementation?: typeof fetch) {
  return requestEnvelope("/api/user/ssh-keys", listPayload(sshKeySchema), {fallback: "公钥列表读取失败", fetchImplementation});
}

export function addSshKey(input: SshKeyInput, fetchImplementation?: typeof fetch) {
  const body = sshKeyInput.parse(input);
  return requestEnvelope("/api/user/ssh-keys", z.unknown(), {
    fallback: "公钥添加失败",
    init: jsonInit("POST", body),
    fetchImplementation,
  });
}

export function deleteSshKey(id: SshKey["id"], fetchImplementation?: typeof fetch) {
  return requestEnvelope(`/api/user/ssh-keys/${encodeURIComponent(String(id))}`, z.unknown(), {
    fallback: "公钥删除失败",
    init: jsonInit("DELETE"),
    fetchImplementation,
  });
}
