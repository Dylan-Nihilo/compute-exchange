import assert from "node:assert/strict";
import test from "node:test";

import {isBackendRequestError} from "./api/envelope.ts";
import {addSshKey, deleteSshKey, fetchSshKeys, sshKeyInput} from "./buyer-ssh-keys.ts";

const ED25519 = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl me@laptop";
const buyerKey = {id: 1, name: "me@laptop", key_type: "ssh-ed25519", public_key: ED25519,
  fingerprint: "SHA256:aaa", created_at: "2026-10-28T00:00:00Z"};

test("sshKeyInput accepts a single .pub line and rejects private keys or multiple lines", () => {
  assert.equal(sshKeyInput.safeParse({name: "laptop", public_key: ED25519}).success, true);
  assert.equal(sshKeyInput.safeParse({name: "laptop", public_key: `${ED25519}\n${ED25519}`}).success, false);
  assert.equal(sshKeyInput.safeParse({name: "laptop", public_key: "-----BEGIN OPENSSH PRIVATE KEY-----"}).success, false);
  assert.equal(sshKeyInput.safeParse({name: "x".repeat(65), public_key: ED25519}).success, false);
});

test("sshKeyInput treats a blank name as omitted so the backend defaults it to the key comment", () => {
  const parsed = sshKeyInput.parse({name: "  ", public_key: ED25519});
  assert.equal(parsed.name, undefined);
  assert.equal(sshKeyInput.parse({public_key: ED25519}).name, undefined);
  // 64 runes (not UTF-16 units) is the backend limit.
  assert.equal(sshKeyInput.safeParse({name: "钥".repeat(64), public_key: ED25519}).success, true);
});

test("fetchSshKeys parses the plain BuyerKey array", async () => {
  const keys = await fetchSshKeys(async (url) => {
    assert.equal(url, "/api/user/ssh-keys");
    return Response.json({code: 0, data: [buyerKey, {...buyerKey, id: 2, key_type: "ssh-rsa"}]});
  });
  assert.deepEqual(keys.map((key) => [key.id, key.key_type]), [[1, "ssh-ed25519"], [2, "ssh-rsa"]]);
});

test("addSshKey posts the trimmed key without a blank name and returns the created BuyerKey", async () => {
  const created = await addSshKey({name: "", public_key: `  ${ED25519}  `}, async (_url, init) => {
    assert.equal(init?.method, "POST");
    assert.deepEqual(JSON.parse(String(init?.body)), {public_key: ED25519});
    return Response.json({code: 0, data: buyerKey});
  });
  assert.equal(created.name, "me@laptop");
});

test("addSshKey surfaces backend 40001 strength and 40900 limit messages unchanged", async () => {
  for (const [code, message] of [
    [40001, "RSA 公钥至少 3072 位, 建议改用 ed25519(ssh-keygen -t ed25519)"],
    [40900, "每个账户最多 10 把公钥, 请先删除不用的公钥"],
    [40900, "该公钥已添加"],
  ] as const) {
    await assert.rejects(
      addSshKey({public_key: ED25519}, async () => Response.json({code, message})),
      (error) => isBackendRequestError(error) && error.code === code && error.message === message,
    );
  }
});

test("deleteSshKey calls DELETE on the numeric key id and parses {id, deleted}", async () => {
  const result = await deleteSshKey(7, async (url, init) => {
    assert.equal(url, "/api/user/ssh-keys/7");
    assert.equal(init?.method, "DELETE");
    return Response.json({code: 0, data: {id: 7, deleted: true}});
  });
  assert.equal(result.deleted, true);
  assert.throws(() => deleteSshKey(0));
});
