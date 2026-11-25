import assert from "node:assert/strict";
import test from "node:test";

import {BackendRequestError} from "./api/envelope.ts";
import {buildManagedPayload, initialManagedState, isManagedDraftAwaitingSubmit, productSubmitErrorMessage} from "./managed-product.ts";
import {nightlyOrderSummary} from "./nightly.ts";

import {
  awaitsLeaseEndSplit,
  settlementAdjustment,
  createProduct,
  resubmitProduct,
  deliverOrder,
  fetchMyProductGroups,
  fetchMyQualifications,
  fetchResourceSyncs,
  fetchSupplierOrders,
  isManagedOrder,
  managedSettleCopy,
  isManagedProduct,
  isSupplierOrderStatusFilter,
  fetchSupplierSettlements,
  fetchSupplierSettlementSummary,
  fetchSupplierPaymentAccount,
  paymentAccountFileMaxBytes,
  submitSupplierPaymentAccount,
  uploadSupplierPaymentAccountFile,
  validatePaymentAccountApplication,
  type PaymentAccountApplication,
  submitPassiveResourceSync,
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
    }, {
      id: 2, user_id: 2, qual_type: "supplier_onboarding", cert_name: "测试企业",
      cert_number: "91310115MA1K4X2A7Q", cert_url: "license.pdf",
      expires_at: null, status: "verified", created_at: "2026-08-25T10:00:00Z",
    }]}));
  assert.equal(list.length, 2);
  assert.equal(list[0].status, "pending");
  assert.equal(list[1].status, "approved");
});

test("submitQualification posts payload and surfaces backend errors", async () => {
  let requestBody = "";
  await submitQualification(
    {qual_type: "idc_license", cert_name: "IDC 许可证", cert_number: "B1", cert_url: "https://example.com/c.pdf", expires_at: "2027-09-30"},
    async (_input, init) => {
      requestBody = String(init?.body);
      return Response.json({code: 0, message: "success"});
    },
  );
  assert.equal(JSON.parse(requestBody).qual_type, "idc_license");
  assert.equal(JSON.parse(requestBody).expires_at, "2027-09-30");

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

test("createProduct surfaces price warnings as strings and tolerates odd shapes", async () => {
  const input = {product_type: "card_rental", pricing_mode: "hourly", price_negotiable: false, stock: 0, region: "北京", compliance_agreed: true};
  const strings = await createProduct(input, async () =>
    Response.json({code: 0, message: "success", data: {id: 8, warnings: ["日价高于 24 小时价"]}}));
  assert.deepEqual(strings.data?.warnings, ["日价高于 24 小时价"]);

  const objects = await createProduct(input, async () =>
    Response.json({code: 0, message: "success", data: {id: 9, warnings: [{code: "daily_gt_hourly", message: "日价高于 24 小时价"}]}}));
  assert.deepEqual(objects.data?.warnings, ["日价高于 24 小时价"]);

  const malformed = await createProduct(input, async () =>
    Response.json({code: 0, message: "success", data: {id: 10, warnings: [42]}}));
  assert.equal(malformed.data?.id, 10);
  assert.equal(malformed.data?.warnings, null);
});

test("isManagedProduct and isManagedOrder only trust an explicit managed field", () => {
  assert.equal(isManagedProduct({fulfillment_mode: "managed"}), true);
  assert.equal(isManagedProduct({fulfillment_mode: "manual"}), false);
  assert.equal(isManagedProduct({}), false);
  assert.equal(isManagedProduct(undefined), false);
  assert.equal(isManagedOrder({fulfillment_mode: "managed"}), true);
  assert.equal(isManagedOrder({}), false);
});

test("fetchSupplierOrders forwards filters and parses page", async () => {
  let requestedUrl = "";
  const page = await fetchSupplierOrders({status: "provisioning", page: 2, pageSize: 10}, async (input) => {
    requestedUrl = String(input);
    return Response.json({code: 0, message: "success", data: {
      list: [{
        id: 1, order_no: "ORD-1", buyer_id: 3, product_id: 7, quantity: 1,
        duration: 24, unit_price: 3500, total_amount: 84000, platform_fee: 4200,
        current_lease: {order_no: "REN-2", duration: 2, pricing_mode: "hourly"},
        status: "provisioning", payment_expires_at: null, lease_start_at: null,
        lease_end_at: null, compliance_agreed: true,
        created_at: "2026-08-26T09:00:00Z", updated_at: "2026-08-26T09:00:00Z",
        gpu_model: "NVIDIA H100", product_type: "card_rental", pricing_mode: "hourly", settle_ready_at: null,
      }],
      total: 11, status_counts: {provisioning: 3, active: 8}, page: 2, page_size: 10,
    }});
  });
  assert.equal(requestedUrl, "/api/supplier/orders?status=provisioning&page=2&page_size=10");
  assert.equal(page.orders.length, 1);
  assert.equal(page.orders[0].gpu_model, "NVIDIA H100");
  assert.deepEqual(page.orders[0].current_lease, {order_no: "REN-2", duration: 2, pricing_mode: "hourly"});
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

test("settlements carry T-106 refund_deduction / platform_compensation", async () => {
  const page = await fetchSupplierSettlements({}, async () => Response.json({code: 0, message: "success", data: {
    list: [
      {id: 2, settlement_id: "ST-2", order_no: "ORD-2", payee_type: "supplier", payee_id: 9, amount: 70000, status: "pending",
        fail_reason: "", refund_deduction: 14000, platform_compensation: 3000, created_at: "2026-10-30T09:00:00Z", updated_at: null,
        fulfillment_mode: "managed", settle_ready_at: null},
      {id: 3, settlement_id: "ST-3", order_no: "ORD-3", payee_type: "supplier", payee_id: 9, amount: 84000, status: "success",
        fail_reason: null, created_at: "2026-10-30T09:00:00Z", fulfillment_mode: "managed", settle_ready_at: "2026-10-31T00:00:00Z"},
      {id: 4, settlement_id: "ST-4", order_no: "ORD-4", payee_type: "supplier", payee_id: 9, amount: 500, status: "pending",
        fail_reason: "", created_at: "2026-10-30T09:00:00Z", fulfillment_mode: "manual", settle_ready_at: null},
    ],
    total: 2, page: 1, page_size: 20,
  }}));
  const [adjusted, plain, manual] = page.settlements;
  assert.equal(awaitsLeaseEndSplit(adjusted!), true);
  assert.equal(awaitsLeaseEndSplit(plain!), false);
  assert.equal(awaitsLeaseEndSplit(manual!), false);
  assert.equal(awaitsLeaseEndSplit({}), false);
  assert.deepEqual(settlementAdjustment(adjusted!), {locked: 84000, deduction: 14000, compensation: 3000});
  assert.equal(plain?.refund_deduction, 0);
  assert.equal(settlementAdjustment(plain!), null);
});

test("fetchResourceSyncs forwards filters and parses snapshots", async () => {
  let requestedUrl = "";
  const page = await fetchResourceSyncs({productId: 7, page: 2, pageSize: 10}, async (input) => {
    requestedUrl = String(input);
    return Response.json({code: 0, message: "success", data: {
      list: [{
        id: 1, product_id: 7, supplier_id: 9, sync_type: "passive",
        stock_before: 32, stock_after: 30, diff: -2, reason: "机房例行上报",
        operator_id: 9, anomaly: false, created_at: "2026-08-27T02:00:00Z",
      }],
      total: 3, page: 2, page_size: 10,
    }});
  });
  assert.equal(requestedUrl, "/api/supplier/resource-syncs?product_id=7&page=2&page_size=10");
  assert.equal(page.syncs.length, 1);
  assert.equal(page.syncs[0].diff, -2);
  assert.equal(page.total, 3);

  const empty = await fetchResourceSyncs({}, async () =>
    Response.json({code: 0, message: "success", data: {list: null, total: 0, page: 1, page_size: 20}}));
  assert.deepEqual(empty.syncs, []);
});

test("submitPassiveResourceSync posts absolute stock and surfaces errors", async () => {
  let requestedUrl = "";
  let requestBody = "";
  await submitPassiveResourceSync(
    {product_id: 7, stock_after: 30, reason: "机房例行上报"},
    async (input, init) => {
      requestedUrl = String(input);
      requestBody = String(init?.body);
      return Response.json({code: 0, message: "success"});
    },
  );
  assert.equal(requestedUrl, "/api/supplier/resource-syncs/passive");
  assert.equal(JSON.parse(requestBody).stock_after, 30);

  await assert.rejects(
    submitPassiveResourceSync(
      {product_id: 7, stock_after: -1, reason: ""},
      async () => Response.json({code: 40001, message: "stock_after 必填"}),
    ),
    /stock_after 必填/,
  );
});


test("publishing and resubmitting include the explicitly accepted document version", async () => {
  const input = {product_type: "card_rental" as const, pricing_mode: "hourly" as const, price_negotiable: false, stock: 2, region: "北京", compliance_agreed: true};
  const transport: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(body.compliance_agreed, true);
    assert.equal(body.compliance_version, "2026-09-06.1");
    return Response.json({code: 0, message: "success", data: {id: 7}});
  };
  await createProduct(input, transport);
  await resubmitProduct(7, input, transport);
});

test("supplier order tabs accept status groups and reject invalid members", () => {
  for (const value of ["", "paid,provisioning", "completed,refunded,cancelled,frozen", "active"]) assert.equal(isSupplierOrderStatusFilter(value), true);
  for (const value of ["paid,unknown", "paid,", ",active"]) assert.equal(isSupplierOrderStatusFilter(value), false);
});

test("qualification expiry status follows server calendar days and preserves review states", async () => {
  const cases = [
    ["verified", 31, "approved"], ["verified", 30, "expiring"], ["verified", 0, "expiring"],
    ["verified", -1, "expired"], ["expired", -1, "expired"], ["pending", -1, "pending"],
    ["rejected", 5, "rejected"], ["verified", null, "approved"],
    ["verified", 0, "superseded"], ["expired", -1, "superseded"],
  ] as const;
  const list = await fetchMyQualifications(async () => Response.json({code: 0, message: "success", data: cases.map(([status, days], i) => ({
    id: i + 1, user_id: 2, qual_type: "idc_license", cert_name: "License", cert_number: "TEST",
    cert_url: "https://example.test/c.pdf", expires_at: days === null ? null : "2026-09-30T00:00:00+08:00",
    expires_in_days: days, superseded: i >= 8, status, created_at: "2026-08-25T10:00:00Z",
  }))}));
  assert.deepEqual(list.map((q) => q.status), cases.map((c) => c[2]));
});

const validPaymentAccountApplication: PaymentAccountApplication = {
  sign_name: "北京测试科技有限公司", short_name: "测试科技", licence_no: "91110000MA00000000", licence_url: "u-lic",
  legal_name: "张三", legal_licence_no: "11010119900101123X", legal_front_url: "u-front", legal_back_url: "u-back",
  contact_name: "李四", contact_mobile: "13800000000", contact_email: "a@b.cn",
  province: "110000", city: "110100", district: "110105", address: "某某路 1 号院",
  bank_card_no: "1234567890123", cnaps_code: "102100099996",
};

test("supplier payment account reads status, prefill and submits the application as JSON", async () => {
  const account = await fetchSupplierPaymentAccount(async (input, init) => {
    assert.equal(String(input), "/api/supplier/payment-account");
    assert.equal(init?.method, undefined);
    return Response.json({code: 0, message: "success", data: {status: "rejected", application_status: "REVIEW_BACK", merchant_no: null, audit_opinion: "营业执照不清晰", prefill: {sign_name: "北京测试科技有限公司", licence_no: "91110000MA00000000", legal_name: "张三"}}});
  });
  assert.equal(account.status, "rejected");
  assert.equal(account.prefill?.sign_name, "北京测试科技有限公司");
  const submitted = await submitSupplierPaymentAccount(validPaymentAccountApplication, async (input, init) => {
    assert.equal(String(input), "/api/supplier/payment-account");
    assert.equal(init?.method, "POST");
    assert.deepEqual(JSON.parse(String(init?.body)), validPaymentAccountApplication);
    return Response.json({code: 0, message: "success", data: {status: "pending", application_status: "REVIEWING", merchant_no: null, audit_opinion: ""}});
  });
  assert.equal(submitted.status, "pending");
  await assert.rejects(submitSupplierPaymentAccount(validPaymentAccountApplication, async () =>
    Response.json({code: 40900, message: "收款账户开通申请正在审核中, 请等待结果"}, {status: 409})), /审核中/);
});

test("payment account application validation matches the backend rules", () => {
  assert.deepEqual(validatePaymentAccountApplication(validPaymentAccountApplication), {});
  const errors = validatePaymentAccountApplication({
    ...validPaymentAccountApplication, licence_no: "123", short_name: "800", legal_licence_no: "1101", contact_mobile: "010-1",
    contact_email: "nope", district: "", address: "1号", bank_card_no: "abc", cnaps_code: "1021", licence_url: "", legal_back_url: "",
  });
  assert.deepEqual(Object.keys(errors).sort(), ["address", "bank_card_no", "cnaps_code", "contact_email", "contact_mobile", "district", "legal_back_url", "legal_licence_no", "licence_no", "licence_url", "short_name"]);
});

test("payment account file upload rejects wrong type or size before any request and returns the stored url", async () => {
  const never = async () => { throw new Error("must not be called"); };
  await assert.rejects(uploadSupplierPaymentAccountFile(new File(["x"], "a.exe", {type: "application/x-msdownload"}), never), /仅支持/);
  await assert.rejects(uploadSupplierPaymentAccountFile(new File([], "a.png", {type: "image/png"}), never), /6MB/);
  await assert.rejects(uploadSupplierPaymentAccountFile(new File([new Uint8Array(paymentAccountFileMaxBytes + 1)], "a.png", {type: "image/png"}), never), /6MB/);
  const url = await uploadSupplierPaymentAccountFile(new File(["png"], "执照.png", {type: "image/png"}), async (input, init) => {
    assert.equal(String(input), "/api/supplier/payment-account/upload");
    assert.equal(init?.method, "POST");
    assert.ok(init?.body instanceof FormData && (init.body.get("file") as File).name === "执照.png");
    return Response.json({code: 0, message: "success", data: {url: "https://staticres.yeepay.com/abc.png"}});
  });
  assert.equal(url, "https://staticres.yeepay.com/abc.png");
  await assert.rejects(uploadSupplierPaymentAccountFile(new File(["png"], "a.png", {type: "image/png"}), async () =>
    Response.json({code: 50000, message: "易宝上传资质文件失败: REG30901 文件上传异常"}, {status: 500})), /REG30901/);
});

test("region data is province → city → district with 6-digit codes", async () => {
  const regions = (await import("../data/cn-regions.json", {with: {type: "json"}})).default as unknown as [string, string, [string, string, [string, string][]][]][];
  assert.equal(regions.length, 31);
  const beijing = regions.find(([code]) => code === "110000");
  assert.equal(beijing?.[1], "北京市");
  assert.equal(beijing?.[2][0][0], "110100");
  assert.deepEqual(beijing?.[2][0][2][0], ["110101", "东城区"]);
  for (const [province, , cities] of regions) {
    assert.match(province, /^\d{6}$/);
    for (const [city, , districts] of cities) {
      assert.match(city, /^\d{6}$/);
      for (const [district] of districts) assert.match(district, /^\d{6}$/);
    }
  }
});

test("managed products: []int split options, draft state and submit-gate messages", async () => {
  let body: Record<string, unknown> = {};
  const input = {
    product_type: "card_rental" as const, pricing_mode: "hourly" as const, price_negotiable: false, stock: 0, region: "北京",
    compliance_agreed: true, fulfillment_mode: "managed" as const, delivery_mode: "container", card_count: 8, card_split_options: [1, 2, 4],
  };
  await createProduct(input, async (_url, init) => {
    body = JSON.parse(String(init?.body));
    return Response.json({code: 0, message: "success", data: {id: 7, warnings: []}});
  });
  assert.deepEqual(body.card_split_options, [1, 2, 4]);

  const gate = "托管商品提交审核前须至少接入一个 ssh 托管节点并通过探活";
  await assert.rejects(resubmitProduct(7, input, async () => Response.json({code: 40001, message: gate})), (error) => {
    assert.ok(error instanceof BackendRequestError);
    assert.equal(error.code, 40001);
    assert.equal(productSubmitErrorMessage(error, "x"), gate);
    return true;
  });
  await assert.rejects(resubmitProduct(7, input, async () => Response.json({code: 40900, message: "product review conflict"})), (error) => {
    assert.match(productSubmitErrorMessage(error, "x"), /只有草稿或已下架的商品可以提交审核/);
    return true;
  });

  assert.equal(isManagedDraftAwaitingSubmit({fulfillment_mode: "managed", status: "draft", rejected_reason: ""}), true);
  assert.equal(isManagedDraftAwaitingSubmit({fulfillment_mode: "managed", status: "draft", rejected_reason: "规格不符"}), false);
  assert.equal(isManagedDraftAwaitingSubmit({fulfillment_mode: "manual", status: "draft", rejected_reason: ""}), false);
  assert.equal(isManagedDraftAwaitingSubmit({fulfillment_mode: undefined, status: "draft", rejected_reason: ""}), false);
});

test("fetchSupplierOrders keeps the nightly snapshot and rows show the nightly mode", async () => {
  const page = await fetchSupplierOrders({page: 1, pageSize: 10}, async () => Response.json({code: 0, message: "success", data: {
    list: [{
      id: 2, order_no: "ORD-N", buyer_id: 3, product_id: 7, quantity: 2,
      duration: 3, unit_price: 9000, total_amount: 54000, platform_fee: 2700,
      status: "active", payment_expires_at: null, lease_start_at: "2026-11-01T21:50:00+08:00",
      lease_end_at: "2026-11-05T08:00:00+08:00", compliance_agreed: true,
      created_at: "2026-10-30T09:00:00Z", updated_at: "2026-10-30T09:00:00Z",
      gpu_model: "NVIDIA H100", product_type: "card_rental", pricing_mode: "nightly", fulfillment_mode: "managed",
      night_start_date: "2026-11-01T00:00:00+08:00", night_start_min: 1320, night_end_min: 480,
      settle_ready_at: "2026-11-05T09:00:00+08:00",
    }],
    total: 1, status_counts: {active: 1}, page: 1, page_size: 10,
  }}));
  const order = page.orders[0];
  assert.equal(order.night_start_min, 1320);
  assert.equal(nightlyOrderSummary(order), "包夜 · 2026-11-01 晚起 · 每晚 22:00–次日 08:00（北京时间） · 3 晚");
  assert.equal(nightlyOrderSummary({...order, night_start_date: null}), "包夜 · 3 晚");
  assert.equal(nightlyOrderSummary({...order, pricing_mode: "daily"}), null);
  assert.equal(managedSettleCopy(order, (value) => value.slice(0, 10)), "已于 2026-11-05 满足分账条件，将随下一批分账处理。");
  assert.match(managedSettleCopy({settle_ready_at: null}, String), /^平台托管 · 租期结束后分账/);
});

test("buildManagedPayload rejects a night window without container delivery", () => {
  const state = {...initialManagedState(), fulfillmentMode: "managed" as const, availability: "night_window" as const};
  state.prices = {...state.prices, nightly: {enabled: true, price: "90", minDuration: "1"}};
  const bare = buildManagedPayload(state, {cardCount: 8, deliveryMode: "bare_metal"});
  assert.ok("errors" in bare);
  assert.match(bare.errors.night ?? "", /仅支持分卡容器交付/);
  const container = buildManagedPayload(state, {cardCount: 8, deliveryMode: "container"});
  assert.ok(!("errors" in container) || !container.errors.night, JSON.stringify(container));
});
