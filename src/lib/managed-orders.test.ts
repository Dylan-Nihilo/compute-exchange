import assert from "node:assert/strict";
import test from "node:test";

import {isBackendRequestError} from "./api/envelope.ts";
import {
  buyerOrderStatusLabel,
  isManagedBuyerOrder,
  needsBuyerReceipt,
} from "./buyer-orders.ts";
import {
  fetchAccessSessions,
  fetchManagedAccess,
  formatBytes,
  sshCommand,
} from "./managed-orders.ts";

const ok = (data: unknown) => Response.json({code: 0, message: "success", data});
const access = {gateway_host: "gw.omnisline.com", gateway_port: 2222, login: "l-7f3k9q2a", lease_state: "active",
  access_until: "2026-10-29T10:00:00+08:00", grace_until: null, auth_methods: ["publickey", "password"]};

test("fetchManagedAccess parses fleet.OrderAccess exactly", async () => {
  const parsed = await fetchManagedAccess("ORD20261028001", async (url) => {
    assert.equal(url, "/api/buyer/orders/ORD20261028001/access");
    return ok(access);
  });
  assert.deepEqual(parsed.auth_methods, ["publickey", "password"]);
  assert.equal(parsed.grace_until, null);
  assert.equal(sshCommand(parsed), "ssh -p 2222 l-7f3k9q2a@gw.omnisline.com");
  assert.equal(sshCommand({...parsed, gateway_port: 22}), "ssh l-7f3k9q2a@gw.omnisline.com");
  // Fields the backend does not send are not part of the contract.
  assert.equal("resource_alert" in parsed, false);
  assert.equal("outage_remedy" in parsed, false);
});

test("fetchManagedAccess rejects an unknown lease_state and a string gateway_port", async () => {
  await assert.rejects(fetchManagedAccess("ORD20261028001", async () => ok({...access, lease_state: "running"})));
  await assert.rejects(fetchManagedAccess("ORD20261028001", async () => ok({...access, gateway_port: "2222"})));
});

test("fetchManagedAccess surfaces the manual-order 40400 message unchanged", async () => {
  const message = "该订单为人工交付, 没有网关连接信息";
  await assert.rejects(
    fetchManagedAccess("ORD20261028001", async () => Response.json({code: 40400, message})),
    (error) => isBackendRequestError(error) && error.code === 40400 && error.message === message,
  );
});

test("fetchAccessSessions requests a page and parses the paged AccessSession list", async () => {
  const page = await fetchAccessSessions("ORD20261028001", 2, async (url) => {
    assert.equal(url, "/api/buyer/orders/ORD20261028001/sessions?page=2&page_size=20");
    return ok({list: [{id: 9, lease_no: "l-7f3k9q2a", remote_ip: "198.51.100.7", auth_method: "publickey",
      key_fingerprint: "SHA256:abc", key_name: "laptop", started_at: "2026-10-28T01:00:00Z", ended_at: null,
      bytes_up: 1024, bytes_down: 2048, end_reason: null}], total: 21, page: 2, page_size: 20});
  });
  assert.equal(page.total, 21);
  assert.equal(page.list[0]?.key_name, "laptop");
  const empty = await fetchAccessSessions("ORD20261028001", 1, async () => ok({list: null, total: 0, page: 1, page_size: 20}));
  assert.deepEqual(empty.list, []);
});

test("fetchAccessSessions caps page_size at the backend maximum of 100", async () => {
  await fetchAccessSessions("ORD20261028001", 1, async (url) => {
    assert.equal(url, "/api/buyer/orders/ORD20261028001/sessions?page=1&page_size=100");
    return ok({list: [], total: 0, page: 1, page_size: 100});
  }, 500);
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
