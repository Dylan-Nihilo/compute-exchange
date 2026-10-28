import assert from "node:assert/strict";
import test from "node:test";

import {isBackendRequestError} from "./api/envelope.ts";
import {activeSshKeys, addSshKey, deleteSshKey, fetchSshKeys, sshKeyInput} from "./buyer-ssh-keys.ts";

const ED25519 = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl me@laptop";

test("sshKeyInput accepts a single .pub line and rejects private keys or multiple lines", () => {
  assert.equal(sshKeyInput.safeParse({name: "laptop", public_key: ED25519}).success, true);
  assert.equal(sshKeyInput.safeParse({name: "laptop", public_key: `${ED25519}\n${ED25519}`}).success, false);
  assert.equal(sshKeyInput.safeParse({name: "laptop", public_key: "-----BEGIN OPENSSH PRIVATE KEY-----"}).success, false);
  assert.equal(sshKeyInput.safeParse({name: " ", public_key: ED25519}).success, false);
});

test("fetchSshKeys accepts a list payload and activeSshKeys drops revoked keys", async () => {
  const keys = await fetchSshKeys(async (url) => {
    assert.equal(url, "/api/user/ssh-keys");
    return Response.json({code: 0, data: {list: [
      {id: 1, name: "a", fingerprint: "SHA256:aaa", created_at: "2026-10-28T00:00:00Z", revoked_at: null},
      {id: 2, name: "b", fingerprint: "SHA256:bbb", created_at: "2026-10-28T00:00:00Z", revoked_at: "2026-10-28T01:00:00Z"},
    ]}});
  });
  assert.deepEqual(activeSshKeys(keys).map((key) => key.id), [1]);
});

test("addSshKey posts the trimmed key and surfaces the 40900 limit message", async () => {
  await assert.rejects(
    addSshKey({name: "laptop", public_key: `  ${ED25519}  `}, async (_url, init) => {
      assert.equal(init?.method, "POST");
      assert.equal(JSON.parse(String(init?.body)).public_key, ED25519);
      return Response.json({code: 40900, message: "最多添加 10 把公钥"}, {status: 409});
    }),
    (error) => isBackendRequestError(error) && error.message === "最多添加 10 把公钥" && error.code === 40900,
  );
});

test("deleteSshKey calls DELETE on the key id", async () => {
  await deleteSshKey(7, async (url, init) => {
    assert.equal(url, "/api/user/ssh-keys/7");
    assert.equal(init?.method, "DELETE");
    return Response.json({code: 0, data: null});
  });
});
