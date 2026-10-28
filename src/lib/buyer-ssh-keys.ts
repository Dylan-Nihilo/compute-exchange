import {z} from "zod";

import {jsonInit, listPayload, requestEnvelope} from "./api/envelope.ts";

// Buyer SSH public keys for the managed-rental gateway (managed-rental-api.md, fleet/access.go).
// Keys apply to every managed lease the buyer owns; at most 10 per account (40900 beyond).

export const MAX_SSH_KEYS = 10;

/** fleet.BuyerKey. GET returns only active keys (deleted keys are soft-deleted server side). */
export const sshKeySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  // Derived from public_key: ssh-ed25519 / ecdsa-sha2-nistp256|384|521 / ssh-rsa.
  key_type: z.string(),
  public_key: z.string(),
  fingerprint: z.string(),
  created_at: z.string(),
});
export type SshKey = z.infer<typeof sshKeySchema>;

export const sshKeyTypeLabels: Record<string, string> = {
  "ssh-ed25519": "Ed25519",
  "ecdsa-sha2-nistp256": "ECDSA P-256",
  "ecdsa-sha2-nistp384": "ECDSA P-384",
  "ecdsa-sha2-nistp521": "ECDSA P-521",
  "ssh-rsa": "RSA",
};

/** Mirrors the backend rule text; the backend's own 40001 message is what gets displayed. */
export const sshKeyRulesText = "支持 ssh-ed25519、ecdsa-sha2-nistp256/384/521、ssh-rsa（至少 3072 位，推荐 ed25519）；每个账户最多 10 把。";

const KEY_TYPES = ["ssh-ed25519", "ecdsa-sha2-nistp256", "ecdsa-sha2-nistp384", "ecdsa-sha2-nistp521", "ssh-rsa"];

/**
 * Client-side shape check only. RSA strength (≥ 3072 bits), duplicates and the 10-key limit are
 * enforced by the backend, which answers 40001/40900 with the reason. A blank name is omitted so
 * the backend defaults it to the key comment (or "SSH 公钥").
 */
export const sshKeyInput = z.object({
  name: z
    .string()
    .trim()
    .refine((value) => [...value].length <= 64, "名称最多 64 个字符")
    .transform((value) => value || undefined)
    .optional(),
  public_key: z
    .string()
    .trim()
    .min(1, "请粘贴公钥")
    .max(1024, "公钥过长, 请改用 ed25519 或 3072/4096 位 RSA")
    .refine((value) => !/[\r\n]/.test(value), "一次只能添加一把公钥，请粘贴单行内容")
    .refine((value) => {
      const [type, body] = value.split(/\s+/);
      return KEY_TYPES.includes(type ?? "") && /^[A-Za-z0-9+/]+={0,3}$/.test(body ?? "");
    }, "仅支持 ssh-ed25519、ecdsa 或 3072 位以上的 ssh-rsa 公钥（.pub 文件内容）"),
});
export type SshKeyInput = z.input<typeof sshKeyInput>;

export function fetchSshKeys(fetchImplementation?: typeof fetch) {
  return requestEnvelope("/api/user/ssh-keys", listPayload(sshKeySchema), {fallback: "公钥列表读取失败", fetchImplementation});
}

export function addSshKey(input: SshKeyInput, fetchImplementation?: typeof fetch) {
  const body = sshKeyInput.parse(input);
  return requestEnvelope("/api/user/ssh-keys", sshKeySchema, {
    fallback: "公钥添加失败",
    init: jsonInit("POST", body),
    fetchImplementation,
  });
}

export function deleteSshKey(id: SshKey["id"], fetchImplementation?: typeof fetch) {
  if (!Number.isInteger(id) || id <= 0) throw new Error("公钥编号无效");
  return requestEnvelope(
    `/api/user/ssh-keys/${id}`,
    z.object({id: z.number().int().positive(), deleted: z.literal(true)}),
    {fallback: "公钥删除失败", init: jsonInit("DELETE"), fetchImplementation},
  );
}
