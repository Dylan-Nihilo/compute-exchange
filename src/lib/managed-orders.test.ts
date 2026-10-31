import assert from "node:assert/strict";
import test from "node:test";

import {isBackendRequestError} from "./api/envelope.ts";
import {
  buyerOrderStatusLabel,
  isManagedBuyerOrder,
  needsBuyerReceipt,
} from "./buyer-orders.ts";
import {
  expiryReminder,
  fetchAccessSessions,
  fetchManagedAccess,
  fetchOrderNights,
  fetchOrderOutages,
  formatBytes,
  formatFen,
  formatMinutes,
  inactiveHint,
  isBareMetalLease,
  nightStateLabel,
  outageCauseCopy,
  outageItemStatus,
  remedyLabel,
  refundThresholdText,
  setOutageRemedy,
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

test("delivery_kind decides bare metal; product delivery_mode is only the fallback", async () => {
  const bare = await fetchManagedAccess("ORD20261028001", async () => ok({...access, delivery_kind: "bare_metal"}));
  assert.equal(isBareMetalLease(bare, "container"), true);
  assert.equal(isBareMetalLease({delivery_kind: "container"}, "bare_metal"), false);
  assert.equal(isBareMetalLease({}, "bare_metal"), true);
  assert.equal(isBareMetalLease(undefined, "bare_metal"), true);
  assert.equal(isBareMetalLease(undefined, null), false);
  await assert.rejects(fetchManagedAccess("ORD20261028001", async () => ok({...access, delivery_kind: "vm"})));
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

const outages = {
  order_no: "ORD20261028001", lease_no: "l-7f3k9q2a", lease_state: "active", access_until: "2026-10-30T10:00:00+08:00",
  remedy: "extend", refund_requested_at: null, can_change_remedy: true, refund_eligible: false, refund_available: false,
  term_minutes: 1440, term_outage_minutes: 12, longest_outage_minutes: 8, refund_ratio: 0.1, refund_single_hours: 2,
  extended_minutes: 8, extended_nights: null, pending_refund_amount: 0,
  items: [
    {id: 1, cause: "node_offline", liable: "supplier", started_at: "2026-10-28T02:00:00Z", ended_at: "2026-10-28T02:08:00Z",
      ongoing: false, minutes: 8, counted: true, remedy: "extend", remedy_applied_at: "2026-10-28T02:08:00Z", remedy_amount: null},
    {id: 2, cause: "gateway_down", liable: "platform", started_at: "2026-10-28T03:00:00Z", ended_at: null,
      ongoing: true, minutes: 4, counted: null, remedy: null, remedy_applied_at: null, remedy_amount: null},
  ],
};

test("fetchOrderOutages parses fleet.OrderOutages and tolerates null items", async () => {
  const parsed = await fetchOrderOutages("ORD20261028001", async (url) => {
    assert.equal(url, "/api/buyer/orders/ORD20261028001/outages");
    return ok(outages);
  });
  assert.equal(parsed.items.length, 2);
  assert.equal(outageItemStatus(parsed.items[0]!), "已顺延");
  assert.equal(outageItemStatus(parsed.items[1]!), "进行中");
  const empty = await fetchOrderOutages("ORD20261028001", async () => ok({...outages, items: null}));
  assert.deepEqual(empty.items, []);
  await assert.rejects(fetchOrderOutages("ORD20261028001", async () => ok({...outages, remedy: "cash"})));
});

test("outageItemStatus covers pending, below-threshold and refund states", () => {
  const base = {ongoing: false, counted: true as boolean | null, remedy: "refund" as "refund" | "extend" | null, remedy_applied_at: null as string | null};
  assert.equal(outageItemStatus({...base, counted: null}), "待结算");
  assert.equal(outageItemStatus({...base, counted: false}), "不足起算时长，不补偿");
  assert.equal(outageItemStatus(base), "待退费");
  assert.equal(outageItemStatus({...base, remedy_applied_at: "2026-10-28T02:08:00Z"}), "已退费");
});

test("setOutageRemedy PUTs {remedy} and keeps the Yeepay 50000 message", async () => {
  const next = await setOutageRemedy("ORD20261028001", "extend", async (url, init) => {
    assert.equal(url, "/api/buyer/orders/ORD20261028001/outage-remedy");
    assert.equal(init?.method, "PUT");
    assert.deepEqual(JSON.parse(String(init?.body)), {remedy: "extend"});
    return ok(outages);
  });
  assert.equal(next.remedy, "extend");
  const message = "易宝部分退款能力未确认，暂只支持顺延补偿";
  await assert.rejects(
    setOutageRemedy("ORD20261028001", "refund", async () => Response.json({code: 50000, message})),
    (error) => isBackendRequestError(error) && error.code === 50000 && error.message === message,
  );
});

test("refundThresholdText and duration/money formatting", () => {
  assert.equal(refundThresholdText({refund_ratio: 0.1, refund_single_hours: 2}), "本期累计停机 ≥ 租期的 10% 或单次停机 ≥ 2 小时");
  assert.equal(formatMinutes(0), "0 分钟");
  assert.equal(formatMinutes(125), "2 小时 5 分钟");
  assert.equal(formatMinutes(120), "2 小时");
  assert.match(formatFen(7800), /78\.00/);
});

test("inactiveHint distinguishes grace, frozen, purge and bare-metal leases", () => {
  const grace = {lease_state: "grace" as const, access_until: "2026-10-28T02:00:00Z", grace_until: "2026-10-31T02:00:00Z"};
  assert.match(inactiveHint(grace), /宽限期至 .*逾期清除数据/);
  assert.doesNotMatch(inactiveHint(grace, true), /宽限/);
  assert.match(inactiveHint({...grace, lease_state: "suspended"}), /容器与数据保留，请联系客服/);
  assert.match(inactiveHint({...grace, lease_state: "purging"}), /正在清除/);
  assert.match(inactiveHint({...grace, lease_state: "purged"}, true), /整机数据已清除/);
});

test("expiryReminder fires only within 24h of an active lease end", () => {
  const now = Date.parse("2026-10-28T00:00:00Z");
  const access = {lease_state: "active" as const, access_until: "2026-10-28T10:00:00Z", grace_until: null};
  assert.match(expiryReminder(access, false, now) ?? "", /进入宽限期/);
  assert.match(expiryReminder(access, true, now) ?? "", /清除整机数据/);
  assert.equal(expiryReminder({...access, access_until: "2026-10-30T10:00:00Z"}, false, now), null);
  assert.equal(expiryReminder({...access, lease_state: "grace"}, false, now), null);
});

test("nightly remedy, outage-cause and parked copy", () => {
  assert.equal(remedyLabel("extend"), "顺延租期");
  assert.equal(remedyLabel("extend", true), "补加一晚");
  assert.equal(remedyLabel("refund", true), "按比例退费");
  const settled = {ongoing: false, counted: true, remedy: "extend" as const, remedy_applied_at: "2026-11-02T08:00:00+08:00"};
  assert.equal(outageItemStatus(settled), "已顺延");
  assert.equal(outageItemStatus(settled, true), "已补加一晚");
  assert.match(outageCauseCopy.night_unpark_failed!, /本晚未能开机/);
  assert.match(outageCauseCopy.provision_delay!, /开通延迟/);
  assert.match(inactiveHint({lease_state: "parked", access_until: null, grace_until: null}), /白天停机，夜间窗口自动开机/);
});

test("fetchOrderOutages reads extended_nights for nightly orders", async () => {
  const parsed = await fetchOrderOutages("ORD20261028001", async () => ok({...outages, extended_nights: 1}));
  assert.equal(parsed.extended_nights, 1);
  await assert.rejects(fetchOrderOutages("ORD20261028001", async () => ok({...outages, extended_nights: -1})));
});

test("fetchOrderNights parses fleet.OrderNights and labels each night", async () => {
  const nights = {
    order_no: "ORD20261101103000123abc", lease_no: "l-4g7bq4xc", lease_state: "parked", night_start_min: 1320, night_end_min: 480,
    purchased_nights: 3, extended_nights: 1, next_window_start: "2026-11-03T22:00:00+08:00",
    nights: [
      {night_date: "2026-11-01", window_start: "2026-11-01T22:00:00+08:00", window_end: "2026-11-02T08:00:00+08:00",
        state: "ended", fail_cause: null, compensation: false, unparked_at: "2026-11-01T22:00:41+08:00", outage_id: null},
      {night_date: "2026-11-02", window_start: "2026-11-02T22:00:00+08:00", window_end: "2026-11-03T08:00:00+08:00",
        state: "failed", fail_cause: "night_unpark_failed", compensation: false, unparked_at: null, outage_id: 57},
      {night_date: "2026-11-04", window_start: "2026-11-04T22:00:00+08:00", window_end: "2026-11-05T08:00:00+08:00",
        state: "booked", fail_cause: null, compensation: true, unparked_at: null, outage_id: null},
    ],
  };
  const parsed = await fetchOrderNights("ORD20261101103000123abc", async (url) => {
    assert.equal(url, "/api/buyer/orders/ORD20261101103000123abc/nights");
    return ok(nights);
  });
  assert.deepEqual(parsed.nights.map(nightStateLabel), ["已结束", "未开机：本晚未能开机（卡被宿主机占用）", "待开机 · 补偿晚"]);
  assert.equal(nightStateLabel({state: "booked", fail_cause: "node_offline", compensation: false}), "开机重试中：节点离线");
  assert.deepEqual((await fetchOrderNights("ORD1", async () => ok({...nights, nights: null}))).nights, []);
  await assert.rejects(
    fetchOrderNights("ORD1", async () => Response.json({code: 40001, message: "该订单不是包夜订单, 没有每晚记录"}, {status: 400})),
    /该订单不是包夜订单/,
  );
});
