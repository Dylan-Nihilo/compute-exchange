import assert from "node:assert/strict";
import test from "node:test";

import {
  confirmBuyerOrder,
  fetchBuyerOrders,
  isBuyerOrderNo,
  summarizeBuyerOrders,
  type BuyerOrder,
} from "./buyer-orders.ts";

const baseOrder: BuyerOrder = {
  id: 1,
  order_no: "ORD-1",
  buyer_id: 1,
  product_id: 2,
  quantity: 1,
  duration: 24,
  unit_price: 100,
  total_amount: 1200,
  platform_fee: 24,
  status: "pending_payment",
  payment_expires_at: null,
  lease_start_at: null,
  lease_end_at: null,
  compliance_agreed: true,
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
};

test("summarizeBuyerOrders derives actionable buyer metrics", () => {
  const orders: BuyerOrder[] = [
    baseOrder,
    {...baseOrder, id: 2, order_no: "ORD-2", status: "provisioning"},
    {...baseOrder, id: 3, order_no: "ORD-3", status: "active"},
    {...baseOrder, id: 4, order_no: "ORD-4", status: "refunded"},
  ];

  assert.deepEqual(
    summarizeBuyerOrders(orders, 5, new Date("2026-08-21T00:00:00Z")),
    {
      pendingPayment: 1,
      pendingReceipt: 1,
      inProgress: 2,
      monthSpendMinor: 2400,
      recentOrders: orders.slice(0, 3),
      isTruncated: true,
    },
  );
});

test("fetchBuyerOrders forwards supported filters and normalizes an empty page", async () => {
  let requestedUrl = "";
  const result = await fetchBuyerOrders(
    {status: "active", orderNo: "ORD20260823", page: 2, pageSize: 20},
    async (input) => {
      requestedUrl = String(input);
      return Response.json({
        code: 0,
        message: "success",
        data: {list: null, total: 0, page: 2, page_size: 20},
      });
    },
  );

  assert.equal(
    requestedUrl,
    "/api/buyer/orders?page=2&page_size=20&status=active&order_no=ORD20260823",
  );
  assert.deepEqual(result, {orders: [], total: 0, page: 2, pageSize: 20});
});

test("fetchBuyerOrders rejects backend business errors returned with HTTP 200", async () => {
  await assert.rejects(
    fetchBuyerOrders({}, async () =>
      Response.json({code: 40100, message: "未登录"}),
    ),
    /未登录/,
  );
});

test("confirmBuyerOrder uses the backend order number", async () => {
  let requestedUrl = "";
  await confirmBuyerOrder("ORD20260823120000a1b2c3", async (input) => {
    requestedUrl = String(input);
    return Response.json({code: 0, message: "success"});
  });

  assert.equal(
    requestedUrl,
    "/api/buyer/orders/ORD20260823120000a1b2c3/confirm",
  );
  assert.equal(isBuyerOrderNo("ORD20260823120000a1b2c3"), true);
  assert.equal(isBuyerOrderNo("../orders/other"), false);
  await assert.rejects(confirmBuyerOrder("42", async () => new Response()), /订单编号无效/);
});
