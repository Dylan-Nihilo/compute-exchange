import assert from "node:assert/strict";
import test from "node:test";

import {
  applyInvoice,
  fetchBillableOrders,
  fetchBuyerInvoices,
  fetchInvoiceTitle,
  invoiceDownloadUrl,
  isValidTaxNo,
  maskBankAccount,
  maskTaxNo,
  saveInvoiceTitle,
} from "./buyer-invoices.ts";

const baseTitle = {
  id: 1,
  buyer_id: 7,
  title_type: "enterprise",
  company_name: "XX 科技有限公司",
  tax_no: "91110108MA01C8Y35X",
  bank_name: "招商银行北京分行",
  bank_account: "110908877665",
  address: null,
  phone: null,
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
};

const baseInvoice = {
  id: 1,
  invoice_no: "INV-2026-0001",
  buyer_id: 7,
  company_name: baseTitle.company_name,
  tax_no: baseTitle.tax_no,
  bank_name: baseTitle.bank_name,
  bank_account: baseTitle.bank_account,
  amount_fen: 15600000,
  invoice_type: "vat_special",
  status: "issued",
  tax_invoice_no: "243170000001",
  reject_reason: null,
  applied_at: "2026-08-10T00:00:00Z",
  issued_at: "2026-08-12T00:00:00Z",
};

test("isValidTaxNo accepts 15/18/20 length and rejects malformed values", () => {
  assert.equal(isValidTaxNo("91110108MA01C8Y35X"), true);
  assert.equal(isValidTaxNo("110108123456789"), true);
  assert.equal(isValidTaxNo("12345678901234567890"), true);
  assert.equal(isValidTaxNo("abc"), false);
  assert.equal(isValidTaxNo(""), false);
});

test("masking keeps the same shape as the design", () => {
  assert.equal(maskTaxNo("91110108MA01C8Y35X"), "91110108******");
  assert.equal(maskTaxNo("12345"), "12345");
  assert.equal(maskBankAccount("110908877665"), "1109******");
  assert.equal(maskBankAccount("110"), "110");
});

test("invoiceDownloadUrl encodes the invoice number", () => {
  assert.equal(invoiceDownloadUrl("INV-2026-0001"), "/api/buyer/invoices/INV-2026-0001/download");
});

test("fetchInvoiceTitle returns null when no title is set", async () => {
  const title = await fetchInvoiceTitle(async () =>
    Response.json({code: 0, message: "success", data: null}));
  assert.equal(title, null);
});

test("fetchInvoiceTitle reads an existing title", async () => {
  let requestedUrl = "";
  const title = await fetchInvoiceTitle(async (input) => {
    requestedUrl = String(input);
    return Response.json({code: 0, message: "success", data: baseTitle});
  });
  assert.equal(requestedUrl, "/api/buyer/invoices/title");
  assert.equal(title?.company_name, "XX 科技有限公司");
});

test("saveInvoiceTitle PUTs the payload and surfaces backend code errors", async () => {
  let requestMethod = "";
  let requestBody = "";
  const saved = await saveInvoiceTitle(
    {
      company_name: "XX 科技有限公司",
      tax_no: "91110108MA01C8Y35X",
      bank_name: "招商银行北京分行",
      bank_account: "110908877665",
    },
    async (input, init) => {
      requestMethod = init?.method ?? "GET";
      requestBody = String(init?.body);
      return Response.json({code: 0, message: "success", data: baseTitle});
    },
  );
  assert.equal(saved.tax_no, baseTitle.tax_no);
  assert.equal(requestMethod, "PUT");
  assert.equal(JSON.parse(requestBody).bank_name, "招商银行北京分行");

  await assert.rejects(
    saveInvoiceTitle(
      {company_name: "", tax_no: "bad", bank_name: "", bank_account: ""},
      async () => Response.json({code: 40001, message: "纳税人识别号格式不正确(15/18/20 位大写字母或数字)"}),
    ),
    /纳税人识别号格式不正确/,
  );
});

test("fetchBillableOrders normalizes an empty list", async () => {
  const orders = await fetchBillableOrders(async () =>
    Response.json({code: 0, message: "success", data: {list: null, total: 0}}));
  assert.deepEqual(orders, []);
});

test("applyInvoice posts order numbers and returns the created invoice summary", async () => {
  let body: unknown = null;
  const result = await applyInvoice(["ORD-1", "ORD-2"], async (_input, init) => {
    body = JSON.parse(String(init?.body));
    return Response.json({
      code: 0,
      message: "success",
      data: {invoice_no: "INV-2026-0002", amount_fen: 24520000, status: "pending"},
    });
  });
  assert.deepEqual(body, {order_nos: ["ORD-1", "ORD-2"]});
  assert.equal(result.invoice_no, "INV-2026-0002");

  await assert.rejects(applyInvoice([]), /请选择需要开票的订单/);
  await assert.rejects(
    applyInvoice(["ORD-1"], async () =>
      Response.json({code: 40001, message: "存在不可开票订单: 未支付、已退款或已在其他发票中申请"})),
    /不可开票订单/,
  );
});

test("fetchBuyerInvoices parses the page envelope", async () => {
  let requestedUrl = "";
  const page = await fetchBuyerInvoices({page: 2, pageSize: 10}, async (input) => {
    requestedUrl = String(input);
    return Response.json({
      code: 0,
      message: "success",
      data: {list: [baseInvoice], total: 11, page: 2, page_size: 10},
    });
  });
  assert.equal(requestedUrl, "/api/buyer/invoices?page=2&page_size=10");
  assert.equal(page.invoices.length, 1);
  assert.equal(page.invoices[0].status, "issued");
  assert.equal(page.total, 11);
});
