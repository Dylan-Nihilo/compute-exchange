import assert from "node:assert/strict";
import test from "node:test";

import {summarizeBuyerOrders, type BuyerOrder} from "./buyer-orders.ts";

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
