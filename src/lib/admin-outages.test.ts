import assert from "node:assert/strict";
import test from "node:test";

import {isBackendRequestError} from "./api/envelope.ts";
import {
  adminOutageStatus,
  createSupplierBreachRefund,
  fetchAdminOutages,
  fetchPartialRefunds,
  fetchSupplierCredit,
  fetchSupplierCredits,
  overrideSupplierCredit,
} from "./admin-outages.ts";

const ok = (data: unknown) => Response.json({code: 0, message: "success", data});
const outage = {id: 5, lease_id: 3, order_id: 9, node_id: 7, cause: "node_offline", liable: "supplier",
  started_at: "2026-10-28T02:00:00Z", ended_at: "2026-10-28T03:00:00Z", seconds: 3600, minutes: 60, counted: true,
  remedy: "refund", remedy_applied_at: null, remedy_amount: 7800, liability_amount: 7800, detail: "P1 ssh timeout",
  lease_no: "l-7f3k9q2a", order_no: "ORD20261028001", supplier_id: 20};
const credit = {supplier_id: 20, score: 55, outage_minutes_30d: 400, outage_count_30d: 3, probe_failures_30d: 2,
  defaults_30d: 0, dispatch_stopped: true, override_mode: "auto", override_by: null, override_reason: null, override_at: null,
  computed_at: "2026-10-28T03:00:00Z"};

test("fetchAdminOutages encodes flags as 1 and parses AdminOutage", async () => {
  const page = await fetchAdminOutages({order_no: "ORD20261028001", open: false, refund_pending: true, page: 2}, async (url) => {
    assert.equal(url, "/api/admin/lease-outages?order_no=ORD20261028001&refund_pending=1&page=2&page_size=20");
    return ok({list: [outage], total: 21, page: 2, page_size: 20});
  });
  assert.equal(page.total, 21);
  assert.equal(adminOutageStatus(page.list[0]!), "待退费");
  const row = page.list[0]!;
  assert.equal(adminOutageStatus({...row, ended_at: null}), "进行中");
  assert.equal(adminOutageStatus({...row, counted: false}), "不计入");
});

test("supplier credits list, detail and override", async () => {
  const list = await fetchSupplierCredits({stopped: true}, async (url) => {
    assert.equal(url, "/api/admin/supplier-credits?stopped=1&page=1&page_size=20");
    return ok({list: [credit], total: 1, page: 1, page_size: 20});
  });
  assert.equal(list.list[0]?.dispatch_stopped, true);
  const detail = {...credit, stop_below: 60, nodes: [{id: 7, node_name: "gpu-a", dispatch_hold: true,
    dispatch_hold_reason: "信用分低于阈值", dispatch_hold_at: "2026-10-28T03:00:00Z", schedulable: true, outage_minutes_30d: 400}]};
  const parsed = await fetchSupplierCredit(20, async (url) => {
    assert.equal(url, "/api/admin/supplier-credits/20");
    return ok(detail);
  });
  assert.equal(parsed.nodes[0]?.dispatch_hold, true);
  await assert.rejects(overrideSupplierCredit(20, "stop", "  "), /必须填写理由/);
  const saved = await overrideSupplierCredit(20, "allow", " 已核实 ", async (url, init) => {
    assert.equal(url, "/api/admin/supplier-credits/20/override");
    assert.equal(init?.method, "PUT");
    assert.deepEqual(JSON.parse(String(init?.body)), {mode: "allow", reason: "已核实"});
    return ok({...detail, override_mode: "allow"});
  });
  assert.equal(saved.override_mode, "allow");
});

test("partial refunds and breach refund surface backend errors", async () => {
  const page = await fetchPartialRefunds({status: "failed"}, async (url) => {
    assert.equal(url, "/api/admin/payment/partial-refunds?status=failed&page=1&page_size=20");
    return ok({list: [{id: 1, payment_id: 2, order_no: "ORD1", refund_request_id: "P1", amount: 7800, kind: "outage_compensation",
      source_id: 5, reason: null, status: "failed", yeepay_refund_no: null, last_error: "timeout",
      created_at: "2026-10-28T03:00:00Z", updated_at: "2026-10-28T03:00:00Z"}], total: 1, page: 1, page_size: 20});
  });
  assert.equal(page.list[0]?.last_error, "timeout");
  await assert.rejects(createSupplierBreachRefund("ORD1", " "), /违约原因/);
  const message = "部分退款通道未打开";
  await assert.rejects(
    createSupplierBreachRefund("ORD1", "节点离线", async (_url, init) => {
      assert.deepEqual(JSON.parse(String(init?.body)), {order_no: "ORD1", reason: "节点离线"});
      return Response.json({code: 50000, message});
    }),
    (error) => isBackendRequestError(error) && error.code === 50000 && error.message === message,
  );
});
