import assert from "node:assert/strict";
import test from "node:test";

import {
  confirmBuyerOrder,
  fetchAllBuyerOrders,
  fetchBuyerOrderDetail,
  fetchBuyerOrderCredential,
  fetchBuyerOrders,
  filterBuyerBillingOrders,
  isBuyerOrderNo,
  revealBuyerOrderCredential,
  summarizeBuyerOrders,
  summarizeBuyerBilling,
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

test("buyer billing loads every page and derives money from real order states", async () => {
  const orders = Array.from({length: 101}, (_, index): BuyerOrder => ({
    ...baseOrder,
    id: index + 1,
    order_no: `ORD-${String(index + 1).padStart(3, "0")}`,
    status: index === 0 ? "pending_payment" : index === 1 ? "refunded" : "active",
    created_at: index === 100 ? "2026-07-01T00:00:00Z" : "2026-08-01T00:00:00Z",
  }));
  const requestedPages: number[] = [];
  const loaded = await fetchAllBuyerOrders(async (input) => {
    const page = Number(new URL(String(input), "http://localhost").searchParams.get("page"));
    requestedPages.push(page);
    const start = (page - 1) * 100;
    return Response.json({
      code: 0,
      message: "success",
      data: {list: orders.slice(start, start + 100), total: orders.length, page, page_size: 100},
    });
  });

  assert.deepEqual(requestedPages, [1, 2]);
  assert.equal(loaded.length, 101);
  assert.deepEqual(summarizeBuyerBilling(loaded, new Date("2026-08-21T00:00:00Z")), {
    monthSpendMinor: 98 * 1200,
    paidMinor: 99 * 1200,
    pendingMinor: 1200,
    refundedMinor: 1200,
  });
  assert.deepEqual(
    filterBuyerBillingOrders(loaded, "refund", "#ORD-002").map(({order_no}) => order_no),
    ["ORD-002"],
  );
});

test("fetchBuyerOrders rejects backend business errors returned with HTTP 200", async () => {
  await assert.rejects(
    fetchBuyerOrders({}, async () =>
      Response.json({code: 40100, message: "未登录"}),
    ),
    /未登录/,
  );
});

test("fetchBuyerOrders seeds the current local account once when it has no orders", async () => {
  const originalEnvironment = process.env.NODE_ENV;
  const requests: Array<{method: string; url: string}> = [];
  let listReads = 0;
  Object.defineProperty(process.env, "NODE_ENV", {
    configurable: true,
    enumerable: true,
    value: "development",
    writable: true,
  });
  try {
    const result = await fetchBuyerOrders({}, async (input, init) => {
      const url = String(input);
      requests.push({method: init?.method ?? "GET", url});
      if (url === "/api/dev/fixtures/buyer-orders") {
        return Response.json({code: 0, message: "success"});
      }
      listReads += 1;
      return Response.json({
        code: 0,
        message: "success",
        data: listReads === 1
          ? {list: null, total: 0, page: 1, page_size: 100}
          : {list: [baseOrder], total: 1, page: 1, page_size: 100},
      });
    });

    assert.equal(result.total, 1);
    assert.deepEqual(requests, [
      {method: "GET", url: "/api/buyer/orders?page=1&page_size=100"},
      {method: "POST", url: "/api/dev/fixtures/buyer-orders"},
      {method: "GET", url: "/api/buyer/orders?page=1&page_size=100"},
    ]);
  } finally {
    Object.defineProperty(process.env, "NODE_ENV", {
      configurable: true,
      enumerable: true,
      value: originalEnvironment,
      writable: true,
    });
  }
});

test("fetchBuyerOrderDetail validates and reads the dedicated detail endpoint", async () => {
  let requestedUrl = "";
  const detail = await fetchBuyerOrderDetail(
    "ORD20260823120000a1b2c3",
    async (input) => {
      requestedUrl = String(input);
      return Response.json({
        code: 0,
        message: "success",
        data: {
          order: {
            order_no: "ORD20260823120000a1b2c3",
            status: "active",
            quantity: 1,
            duration: 24,
            unit_price: 100,
            total_amount: 2400,
            platform_fee: 120,
            payment_expires_at: null,
            lease_start_at: "2026-08-23T00:00:00Z",
            lease_end_at: "2026-08-24T00:00:00Z",
            compliance_agreed: true,
            created_at: "2026-08-22T00:00:00Z",
            updated_at: "2026-08-23T00:00:00Z",
          },
          product: {
            id: 1,
            product_type: "card_rental",
            gpu_model: "NVIDIA H100",
            card_count: 8,
            machine_count: null,
            total_pflops_approx: null,
            power_capacity_kw: null,
            rack_count: null,
            cpu_spec: "Xeon",
            memory_spec: "1TB",
            storage_spec: "8TB",
            bandwidth_spec: "25Gbps",
            delivery_mode: "bare_metal",
            pricing_mode: "hourly",
            region: "华北",
            self_operated: false,
          },
          supplier: {name: "中联数据", self_operated: false, credit: null},
          delivery: null,
          actions: {
            can_confirm: false,
            can_renew: true,
            can_refund: true,
            can_view_credential: false,
          },
        },
      });
    },
  );

  assert.equal(requestedUrl, "/api/buyer/orders/ORD20260823120000a1b2c3");
  assert.equal(detail.product.gpu_model, "NVIDIA H100");
  assert.equal(isBuyerOrderNo("ORD" + "a".repeat(30)), false);
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

test("buyer credential stays masked until an explicit reveal", async () => {
  const urls: string[] = [];
  const methods: string[] = [];
  const request = async (input: RequestInfo | URL, init?: RequestInit) => {
    urls.push(String(input));
    methods.push(init?.method ?? "GET");
    return Response.json({
      code: 0,
      message: "success",
      data: {
        access_key: "ak-1234",
        access_value: init?.method === "POST" ? "secret" : "se****et",
        access_status: "delivered",
        access_expires_at: null,
        revoked_at: null,
        masked: init?.method !== "POST",
      },
    });
  };

  const masked = await fetchBuyerOrderCredential("ORD20260823120000a1b2c3", request);
  const revealed = await revealBuyerOrderCredential("ORD20260823120000a1b2c3", request);

  assert.deepEqual(urls, [
    "/api/buyer/orders/ORD20260823120000a1b2c3/access-credential",
    "/api/buyer/orders/ORD20260823120000a1b2c3/access-credential/reveal",
  ]);
  assert.deepEqual(methods, ["GET", "POST"]);
  assert.equal(masked.masked, true);
  assert.equal(revealed.access_value, "secret");
});
