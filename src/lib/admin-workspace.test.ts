import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {
  approveQualification,
  fetchAdminProducts,
  fetchAdminQualifications,
  fetchAdminNotices,
  fetchAdminSummary,
} from "./admin-workspace.ts";

describe("admin workspace API", () => {
  it("loads pending qualifications through the admin BFF", async () => {
    const result = await fetchAdminQualifications("pending", async (input) => {
      assert.equal(String(input), "/api/admin/audits/qualifications");
      return Response.json({
        code: 0,
        message: "success",
        data: [
          {
            id: 7,
            user_id: 12,
            qual_type: "supplier_onboarding",
            cert_name: "万象算力（上海）测试有限公司",
            cert_number: "91310115MA1K4X2A7Q",
            cert_url: "license.pdf",
            expires_at: null,
            status: "pending",
            created_at: "2026-09-02T09:30:00+08:00",
            application: {
              company_name: "万象算力（上海）测试有限公司",
              credit_code: "91310115MA1K4X2A7Q",
              representative: "张明远",
              representative_id_number: "110101199001011237",
              business_license_file_name: "license.pdf",
              contact_method: "18800001003",
              bank_name: "招商银行上海张江支行",
              account_name: "万象算力（上海）测试有限公司",
              account_number: "6225888888888888",
              facility_address: "上海市浦东新区张江路 88 号",
              has_idc_license: true,
              power_description: "双路市电与 UPS 保障",
              cooling_description: "液冷与风冷混合系统",
            },
          },
        ],
      });
    });

    assert.equal(result[0]?.user_id, 12);
    assert.equal(result[0]?.status, "pending");
    assert.equal(result[0]?.application?.representative, "张明远");
  });

  it("loads reviewed qualification history through the admin BFF", async () => {
    const result = await fetchAdminQualifications("all", async (input) => {
      assert.equal(String(input), "/api/admin/audits/qualifications?status=all");
      return Response.json({
        code: 0,
        message: "success",
        data: [{
          id: 8,
          user_id: 12,
          qual_type: "supplier_onboarding",
          cert_name: "万象算力（上海）测试有限公司",
          cert_number: "91310115MA1K4X2A7Q",
          cert_url: "license.pdf",
          expires_at: null,
          status: "verified",
          created_at: "2026-09-02T10:00:00+08:00",
        }],
      });
    });

    assert.equal(result[0]?.status, "verified");
  });

  it("approves a qualification through its public action", async () => {
    await approveQualification(7, async (input, init) => {
      assert.equal(String(input), "/api/admin/audits/qualifications/7/approve");
      assert.equal(init?.method, "POST");
      return Response.json({code: 0, message: "success", data: null});
    });
  });

  it("requests the pending product queue from the server", async () => {
    const result = await fetchAdminProducts({status: "pending", pageSize: 100}, async (input) => {
      assert.equal(String(input), "/api/admin/products?page=1&page_size=100&status=pending");
      return Response.json({
        code: 0,
        message: "success",
        data: {
          list: [{
            id: 2,
            supplier_id: 2,
            product_type: "card_rental",
            gpu_model: "NVIDIA H100 SXM 80GB",
            card_count: 8,
            machine_count: 1,
            total_pflops_approx: "15.8",
            power_capacity_kw: null,
            rack_count: null,
            cpu_spec: "2× Intel Xeon 8480+",
            memory_spec: "2TB DDR5",
            storage_spec: "30TB NVMe",
            bandwidth_spec: "10Gbps",
            delivery_mode: "bare_metal",
            pricing_mode: "hourly",
            unit_price: 3500,
            price_negotiable: false,
            available_hours: "全天 24h",
            stock: 8,
            min_order: 1,
            min_duration: 1,
            region: "北京",
            status: "pending",
            health: "unknown",
            self_operated: false,
            compliance_agreed: true,
            created_at: "2026-09-02T09:30:00+08:00",
            updated_at: "2026-09-02T09:30:00+08:00",
          }],
          total: 1,
          page: 1,
          page_size: 100,
        },
      });
    });

    assert.equal(result.items[0]?.health, "unknown");
    assert.equal(result.items[0]?.compliance_agreed, true);
  });

  it("reads published notices back after submission", async () => {
    const notices = await fetchAdminNotices(async (input) => {
      assert.equal(String(input), "/api/admin/cms/notices");
      return Response.json({
        code: 0,
        message: "success",
        data: [{id: 3, content: "维护公告", status: "published", created_by: 1, created_at: "2026-09-03T18:00:00+08:00"}],
      });
    });
    assert.equal(notices[0]?.content, "维护公告");
  });

  it("derives actionable dashboard counts from live admin resources", async () => {
    const responses = new Map<string, unknown>([
      ["/api/admin/audits/qualifications", {code: 0, message: "success", data: [{id: 1, user_id: 2, qual_type: "idc", cert_name: "IDC", cert_number: "B1", cert_url: "a.pdf", expires_at: null, status: "pending", created_at: "2026-09-02T09:30:00+08:00"}]}],
      ["/api/admin/products?page=1&page_size=100&status=pending", {code: 0, message: "success", data: {list: [{id: 2, supplier_id: 2, product_type: "card_rental", gpu_model: "H100", card_count: 8, machine_count: null, total_pflops_approx: null, power_capacity_kw: null, rack_count: null, cpu_spec: "", memory_spec: "", storage_spec: "", bandwidth_spec: "", delivery_mode: "bare_metal", pricing_mode: "hourly", unit_price: 3500, price_negotiable: false, available_hours: "", stock: 8, min_order: 1, min_duration: 1, region: "北京", status: "pending", self_operated: false, created_at: "2026-09-02T09:30:00+08:00", updated_at: "2026-09-02T09:30:00+08:00"}], total: 1, page: 1, page_size: 100}}],
      ["/api/admin/orders?page=1&page_size=100", {code: 0, message: "success", data: {list: [{id: 3, order_no: "ORD000001", buyer_id: 12, product_id: 2, quantity: 1, duration: 1, unit_price: 3500, total_amount: 3500, platform_fee: 175, status: "paid", payment_expires_at: null, lease_start_at: null, lease_end_at: null, compliance_agreed: true, created_at: "2026-09-02T09:30:00+08:00", updated_at: "2026-09-02T09:30:00+08:00"}], total: 1, page: 1, page_size: 100}}],
      ["/api/admin/risk/alerts?page=1&page_size=100", {code: 0, message: "success", data: {list: [{id: 4, level: "high", alert_type: "delivery", target_type: "order", target_id: 3, rule_detail: "凭证异常", status: "pending", created_at: "2026-09-02T09:30:00+08:00"}], total: 1, page: 1, page_size: 100}}],
    ]);
    const result = await fetchAdminSummary(async (input) =>
      Response.json(responses.get(String(input))),
    );

    assert.deepEqual(result, {
      pendingQualifications: 1,
      pendingProducts: 1,
      activeOrders: 1,
      openRiskAlerts: 1,
    });
  });
});
