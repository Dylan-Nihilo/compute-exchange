import assert from "node:assert/strict";
import test from "node:test";

import {isBackendRequestError} from "./api/envelope.ts";
import {
  buyerOrderStatusLabel,
  isManagedBuyerOrder,
  needsBuyerReceipt,
} from "./buyer-orders.ts";
import {
  fetchLeaseOutages,
  fetchManagedAccess,
  formatBytes,
  setOutageRemedy,
  sshCommand,
} from "./managed-orders.ts";

const ok = (data: unknown) => Response.json({code: 0, message: "success", data});

test("fetchManagedAccess parses the gateway login and normalises auth_methods", async () => {
  const access = await fetchManagedAccess("ORD20261028001", async (url) => {
    assert.equal(url, "/api/buyer/orders/ORD20261028001/access");
    return ok({gateway_host: "gw.omnisline.com", gateway_port: 2222, login: "l-7f3k9q2a", lease_state: "active",
      access_until: "2026-10-29T10:00:00+08:00", grace_until: null, auth_methods: "publickey, password"});
  });
  assert.deepEqual(access.auth_methods, ["publickey", "password"]);
  assert.equal(sshCommand(access), "ssh -p 2222 l-7f3k9q2a@gw.omnisline.com");
  assert.equal(sshCommand({...access, gateway_port: 22}), "ssh l-7f3k9q2a@gw.omnisline.com");
});

test("fetchLeaseOutages accepts a bare list and a list with the lease remedy", async () => {
  const outage = {id: 1, cause: "gpu_fault", liable: "supplier", started_at: "2026-10-28T01:00:00Z", ended_at: null};
  const bare = await fetchLeaseOutages("ORD20261028001", async () => ok([outage]));
  assert.equal(bare.outages.length, 1);
  assert.equal(bare.remedy, null);
  const wrapped = await fetchLeaseOutages("ORD20261028001", async () => ok({list: [outage], outage_remedy: "refund"}));
  assert.equal(wrapped.remedy, "refund");
});

test("setOutageRemedy surfaces the backend 50000 message unchanged", async () => {
  const message = "易宝部分退款能力未确认，暂只支持顺延补偿";
  await assert.rejects(
    setOutageRemedy("ORD20261028001", "refund", async (url, init) => {
      assert.equal(url, "/api/buyer/orders/ORD20261028001/outage-remedy");
      assert.equal(init?.method, "PUT");
      assert.equal(init?.body, JSON.stringify({remedy: "refund"}));
      return Response.json({code: 50000, message}, {status: 500});
    }),
    (error) => isBackendRequestError(error) && error.code === 50000 && error.message === message,
  );
});

test("managed orders skip the buyer receipt step and show a provisioning label", () => {
  assert.equal(isManagedBuyerOrder({fulfillment_mode: "managed"}), true);
  assert.equal(isManagedBuyerOrder({}), false);
  assert.equal(needsBuyerReceipt({status: "provisioning"}), true);
  assert.equal(needsBuyerReceipt({status: "provisioning", fulfillment_mode: "managed"}), false);
  assert.equal(buyerOrderStatusLabel({status: "paid", fulfillment_mode: "managed"}), "平台开通中");
  assert.equal(buyerOrderStatusLabel({status: "provisioning"}), "待确认签收");
});

test("formatBytes", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(1536), "1.5 KB");
  assert.equal(formatBytes(5 * 1024 ** 3), "5.0 GB");
});
