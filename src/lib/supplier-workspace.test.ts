import assert from "node:assert/strict";
import test from "node:test";

import {
  createProduct,
  deliverOrder,
  fetchMyProductGroups,
  fetchMyQualifications,
  fetchSupplierOrders,
  fetchSupplierSettlements,
  fetchSupplierSettlementSummary,
  submitQualification,
} from "./supplier-workspace.ts";

test("fetchMyQualifications normalizes empty and populated lists", async () => {
  const empty = await fetchMyQualifications(async () =>
    Response.json({code: 0, message: "success", data: null}));
  assert.deepEqual(empty, []);

  const list = await fetchMyQualifications(async () =>
    Response.json({code: 0, message: "success", data: [{
      id: 1, user_id: 2, qual_type: "idc_license", cert_name: "IDC 许可证",
      cert_number: "B1-2026", cert_url: "https://example.com/c.pdf",
      expires_at: null, status: "pending", created_at: "2026-08-26T10:00:00Z",
    }]}));
  assert.equal(list.length, 1);
  assert.equal(list[0].status, "pending");
});

test("submitQualification posts payload and surfaces backend errors", async () => {
  let requestBody = "";
  await submitQualification(
    {qual_type: "idc_license", cert_name: "IDC 许可证", cert_number: "B1", cert_url: "https://example.com/c.pdf"},
    async (_input, init) => {
      requestBody = String(init?.body);
      return Response.json({code: 0, message: "success"});
    },
  );
  assert.equal(JSON.parse(requestBody).qual_type, "idc_license");

  await assert.rejects(
    submitQualification(
      {qual_type: "", cert_name: "", cert_number: "", cert_url: ""},
      async () => Response.json({code: 40001, message: "参数错误"}),
    ),
    /参数错误/,
  );
});

test("fetchMyProductGroups parses type groups", async () => {
  const groups = await fetchMyProductGroups(async () =>
    Response.json({code: 0, message: "success", data: [{
      product_type: "card_rental", label: "零租(按卡租)", count: 2,
      total_machine: 0, total_card: 16, total_stock: 32, active_count: 2,
      products: null,
    }]}));
  assert.equal(groups.length, 1);
  assert.equal(groups[0].active_count, 2);
  assert.equal(groups[0].total_stock, 32);
});

test("createProduct posts and returns id; backend validation errors surface", async () => {
  const result = await createProduct(
    {product_type: "card_rental", pricing_mode: "hourly", price_negotiable: false, stock: 16, region: "北京", compliance_agreed: true, unit_price: 3500, card_count: 8, gpu_model: "H100"},
    async () => Response.json({code: 0, message: "success", data: {id: 7}}),
  );
  assert.equal(result.data?.id, 7);

  await assert.rejects(
    createProduct(
      {product_type: "card_rental", pricing_mode: "monthly", price_negotiable: false, stock: 0, region: "", compliance_agreed: false},
      async () => Response.json({code: 40001, message: "计费模式不适用于该商品类型"}),
    ),
    /不适用于该商品类型/,
  );
});

test("fetchSupplierOrders forwards filters and parses page", async () => {
  let requestedUrl = "";
  const page = await fetchSupplierOrders({status: "provisioning", page: 2, pageSize: 10}, async (input) => {
    requestedUrl = String(input);
    return Response.json({code: 0, message: "success", data: {
      list: [{
        id: 1, order_no: "ORD-1", buyer_id: 3, product_id: 7, quantity: 1,
        duration: 24, unit_price: 3500, total_amount: 84000, platform_fee: 4200,
        status: "provisioning", payment_expires_at: null, lease_start_at: null,
        lease_end_at: null, compliance_agreed: true,
        created_at: "2026-08-26T09:00:00Z", updated_at: "2026-08-26T09:00:00Z",
        gpu_model: "NVIDIA H100", product_type: "card_rental", pricing_mode: "hourly",
      }],
      total: 11, status_counts: {provisioning: 3, active: 8}, page: 2, page_size: 10,
    }});
  });
  assert.equal(requestedUrl, "/api/supplier/orders?status=provisioning&page=2&page_size=10");
  assert.equal(page.orders.length, 1);
  assert.equal(page.orders[0].gpu_model, "NVIDIA H100");
  assert.equal(page.total, 11);
  assert.deepEqual(page.statusCounts, {provisioning: 3, active: 8});
});

test("deliverOrder posts credential payload by order_no", async () => {
  let requestedUrl = "";
  let requestBody = "";
  const result = await deliverOrder(
    "ORD-1",
    {ip_address: "10.0.0.1", ssh_port: 22, username: "ubuntu", password: "secret"},
    async (input, init) => {
      requestedUrl = String(input);
      requestBody = String(init?.body);
      return Response.json({code: 0, message: "success", data: {
        access_key: "ak-xxx", access_value: "93b4********2d71",
        access_status: "generated", access_expires_at: null, masked: true,
      }});
    },
  );
  assert.equal(requestedUrl, "/api/supplier/orders/ORD-1/deliver");
  assert.equal(JSON.parse(requestBody).ssh_port, 22);
  assert.equal(result.data?.masked, true);
});

test("settlements list and summary parse correctly", async () => {
  const page = await fetchSupplierSettlements({status: "pending"}, async (input) => {
    assert.equal(String(input), "/api/supplier/settlements?status=pending");
    return Response.json({code: 0, message: "success", data: {
      list: [{
        id: 1, settlement_id: "ST-1", order_no: "ORD-1", payee_type: "supplier",
        payee_id: 0, amount: 84000, status: "pending", created_at: "2026-08-26T09:00:00Z",
      }],
      total: 1, page: 1, page_size: 20,
    }});
  });
  assert.equal(page.settlements.length, 1);

  const summary = await fetchSupplierSettlementSummary(async () =>
    Response.json({code: 0, message: "success", data: {total_fen: 100, succeeded_fen: 40, pending_fen: 60}}));
  assert.deepEqual(summary, {total_fen: 100, succeeded_fen: 40, pending_fen: 60});
});
