import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {fetchSupplierApplications, submitSupplierApplication} from "./supplier-application.ts";

const input = {
  requestedRole: "supplier" as const,
  companyName: "万象算力（上海）测试有限公司",
  creditCode: "91310115MA1K4X2A7Q",
  representative: "张明远",
  representativeIdNumber: "110101199001011237",
  businessLicenseFileName: "business-license.pdf",
  businessLicenseFile: new File(["supplier-license"], "business-license.pdf", {type: "application/pdf"}),
  contactMethod: "18800001003",
  bankName: "招商银行上海张江支行",
  accountName: "万象算力（上海）测试有限公司",
  accountNumber: "6225888888888888",
  facilityAddress: "上海市浦东新区张江路 88 号",
  hasIdcLicense: true as const,
  powerDescription: "双路市电与 UPS 保障",
  coolingDescription: "液冷与风冷混合系统",
};

describe("supplier application API", () => {
  it("submits the application through the authenticated BFF", async () => {
    await submitSupplierApplication(input, "12", async (request, init) => {
      if (String(request) === "/api/auth/me") {
        return Response.json({
          code: 0,
          message: "success",
          data: {id: 12, phone: "188****1003", roles: ["buyer"]},
        });
      }
      assert.equal(String(request), "/api/supplier-applications");
      assert.equal(init?.method, "POST");
      assert.ok(init?.body instanceof FormData);
      assert.equal(init.body.get("company_name"), input.companyName);
      const file = init.body.get("business_license");
      assert.ok(file instanceof File);
      assert.equal(await file.text(), "supplier-license");
      return Response.json({code: 0, message: "success", data: qualification(8, "pending")});
    });
  });

  it("keeps pending and approved state so onboarding cannot reopen after approval", async () => {
    const result = await fetchSupplierApplications("12", async () => Response.json({
      code: 0,
      message: "success",
      data: [qualification(8, "pending"), qualification(7, "verified")],
    }));
    assert.deepEqual(result.map(({status}) => status), ["pending", "approved"]);
  });
});

function qualification(id: number, status: string) {
  return {id, user_id: 12, qual_type: "supplier_onboarding", cert_name: input.companyName, cert_number: input.creditCode, cert_url: input.businessLicenseFileName, expires_at: null, status, created_at: "2026-09-02T09:30:00+08:00"};
}
