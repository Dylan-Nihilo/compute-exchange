import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {ApiError, createApiClient} from "./api/client.ts";
import {
  buildMarketHref,
  defaultMarketQuery,
  getMarketProduct,
  getMarketSupplies,
  parseMarketQuery,
} from "./market-api.ts";

describe("compute market API", () => {
  it("unwraps and maps backend products", async () => {
    let requestedUrl = "";
    const client = createApiClient({
      baseUrl: "https://api.example.com/api/v1",
      fetchImplementation: async (input) => {
        requestedUrl = String(input);
        return (
        Response.json({
          code: 0,
          message: "success",
          data: {
            list: [
              {
                id: 7,
                supplier_id: 12,
                product_type: "card_rental",
                gpu_model: "H100",
                card_count: 8,
                machine_count: null,
                rack_count: null,
                memory_spec: "80GB",
                bandwidth_spec: "100 Gbps",
                delivery_mode: "container",
                pricing_mode: "hourly",
                unit_price: 1860,
                price_negotiable: false,
                available_hours: "全天 24h",
                stock: 6,
                region: "乌兰察布",
                total_pflops_approx: "约 32P",
                cpu_spec: "2× Intel Xeon",
                storage_spec: "30TB NVMe",
                min_order: 2,
                min_duration: 4,
                self_operated: true,
              },
            ],
            total: 1,
            page: 1,
            page_size: 20,
          },
          request_id: "request-1",
        })
        );
      },
    });

    const result = await getMarketSupplies(
      {
        ...defaultMarketQuery,
        query: "H100",
        deliveryMode: "container",
        priceMin: 10,
      },
      client,
    );

    assert.match(requestedUrl, /q=H100/);
    assert.match(requestedUrl, /delivery_mode=container/);
    assert.match(requestedUrl, /price_min=1000/);
    assert.equal(result.total, 1);
    assert.equal(result.totalPages, 1);
    assert.deepEqual(result.items, [
      {
        id: "7",
        name: "H100 80GB 零租",
        gpuModel: "H100",
        region: "乌兰察布",
        totalUnits: 8,
        availableUnits: 6,
        unitLabel: "GPU",
        deliveryMode: "容器",
        deliveryModeCode: "container",
        billingMode: "按小时",
        network: "100 Gbps",
        unitPrice: "¥18.60",
        priceUnit: "GPU·小时",
        productType: "card_rental",
        pricingMode: "hourly",
        availableHours: "全天 24h",
        unitPriceMinor: 1860,
        cardCount: 8,
        supplierId: "12",
        productTypeLabel: "零租",
        cpuSpec: "2× Intel Xeon",
        memorySpec: "80GB",
        storageSpec: "30TB NVMe",
        minimumOrder: 2,
        minimumDuration: 4,
        selfOperated: true,
        totalPflopsApprox: "约 32P",
      },
    ]);
  });

  it("accepts the backend's null list for an empty market", async () => {
    const client = createApiClient({
      baseUrl: "https://api.example.com/api/v1",
      fetchImplementation: async () =>
        Response.json({
          code: 0,
          message: "success",
          data: {list: null, total: 0, page: 1, page_size: 20},
          request_id: "request-2",
        }),
    });

    assert.deepEqual(await getMarketSupplies(defaultMarketQuery, client), {
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 1,
    });
  });

  it("rejects business errors returned with HTTP 200", async () => {
    const client = createApiClient({
      baseUrl: "https://api.example.com/api/v1",
      fetchImplementation: async () =>
        Response.json({code: 40001, message: "参数错误"}),
    });

    await assert.rejects(
      getMarketSupplies(defaultMarketQuery, client),
      (error: unknown) =>
        error instanceof ApiError && error.code === "40001",
    );
  });

  it("loads and maps a product detail", async () => {
    const client = createApiClient({
      baseUrl: "https://api.example.com/api/v1",
      fetchImplementation: async () =>
        Response.json({
          code: 0,
          message: "success",
          data: {
            product: {
              id: 7,
              supplier_id: 12,
              product_type: "card_rental",
              gpu_model: "H100",
              card_count: 8,
              machine_count: null,
              rack_count: null,
              total_pflops_approx: "约 32P",
              power_capacity_kw: null,
              cpu_spec: "2× Intel Xeon",
              memory_spec: "80GB",
              storage_spec: "30TB NVMe",
              bandwidth_spec: "100 Gbps",
              delivery_mode: "container",
              pricing_mode: "hourly",
              unit_price: 1860,
              price_negotiable: false,
              available_hours: "全天 24h",
              stock: 6,
              min_order: 2,
              min_duration: 4,
              region: "乌兰察布",
              status: "active",
              self_operated: false,
            },
            credit: {
              supplier_id: 12,
              fulfill_rate: 99.2,
              sla_rate: 99.8,
              violation_count: 0,
              total_orders: 36,
            },
          },
        }),
    });

    const detail = await getMarketProduct("7", client);

    assert.equal(detail?.supplierId, "12");
    assert.equal(detail?.minimumOrder, 2);
    assert.equal(detail?.statusLabel, "在售");
    assert.deepEqual(detail?.credit, {
      fulfillmentRate: 99.2,
      slaRate: 99.8,
      violationCount: 0,
      totalOrders: 36,
    });
  });

  it("returns no detail for the backend's not-found response", async () => {
    const client = createApiClient({
      baseUrl: "https://api.example.com/api/v1",
      fetchImplementation: async () =>
        Response.json({code: 40400, message: "商品不存在"}),
    });

    assert.equal(await getMarketProduct("999", client), null);
  });

  it("normalizes and serializes shareable market queries", () => {
    const query = parseMarketQuery({
      q: "  H100  ",
      product_type: "card_rental",
      price_min: "10.50",
      price_max: "invalid",
      card_count_min: "8",
      sort: "stock_desc",
      page: "3",
      page_size: "50",
    });

    assert.equal(query.query, "H100");
    assert.equal(query.priceMin, 10.5);
    assert.equal(query.priceMax, null);
    assert.equal(query.cardCountMin, 8);
    assert.equal(
      buildMarketHref(query),
      "/market?q=H100&price_min=10.5&card_count_min=8&sort=stock_desc&page=3&page_size=50",
    );
  });
});
