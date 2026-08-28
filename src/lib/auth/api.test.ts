import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {
  currentAccountApi,
  registerSmsApi,
  requestSmsCodeApi,
  smsLoginApi,
  verifyAccountApi,
} from "./api.ts";

describe("authentication API adapter", () => {
  it("passes the untouched Cap token to the SMS endpoint and checks business code", async () => {
    let requestBody: unknown;
    const fetchImplementation: typeof fetch = async (_input, init) => {
      requestBody = JSON.parse(String(init?.body));
      return Response.json({
        code: 0,
        message: "success",
        data: {expires_in: 300, resend_after: 60, preview_code: "123456"},
      });
    };

    const result = await requestSmsCodeApi(
      {
        phoneNumber: "13800138000",
        purpose: "login",
        captchaToken: "cap-token",
      },
      fetchImplementation,
    );
    assert.deepEqual(requestBody, {
      phone: "13800138000",
      purpose: "login",
      captcha_token: "cap-token",
    });
    assert.equal(result.resendAfterSeconds, 60);
    assert.equal(result.previewCode, "123456");

    const legacyResult = await requestSmsCodeApi(
      {
        phoneNumber: "13800138000",
        purpose: "login",
        captchaToken: "cap-token",
      },
      async () =>
        Response.json({
          code: 0,
          message: "success",
          data: {expires_in: 300},
        }),
    );
    assert.equal(legacyResult.resendAfterSeconds, 60);

    await assert.rejects(
      requestSmsCodeApi(
        {
          phoneNumber: "13800138000",
          purpose: "login",
          captchaToken: "cap-token",
        },
        async () => Response.json({code: 42900, message: "请求过于频繁"}),
      ),
      /请求过于频繁/,
    );
  });

  it("maps SMS login without exposing backend tokens to application state", async () => {
    let requestBody: unknown;
    const account = await smsLoginApi(
      {phoneNumber: "13800138000", code: "123456", remember: true},
      async (input, init) => {
        if (String(input) === "/api/auth/kyc/status") {
          return Response.json({
            code: 0,
            message: "success",
            data: {
              personal: {status: "verified"},
              enterprise: {status: "none"},
            },
          });
        }
        requestBody = JSON.parse(String(init?.body));
        return Response.json({
          code: 0,
          message: "success",
          data: {user: {id: 7, phone: "138****8000", roles: ["buyer"]}},
        });
      },
    );
    assert.deepEqual(requestBody, {
      phone: "13800138000",
      sms_code: "123456",
      remember: true,
    });
    assert.equal(account.id, "7");
    assert.deepEqual(account.roles, ["buyer"]);
    assert.equal(account.verificationStatus, "verified");
  });

  it("registers without a password and returns the authenticated account", async () => {
    let requestBody: unknown;
    const result = await registerSmsApi(
      {
        phoneNumber: "13800138000",
        code: "123456",
        agreeTos: true,
        remember: true,
      },
      async (input, init) => {
        if (String(input) === "/api/auth/kyc/status") {
          return Response.json({
            code: 0,
            message: "success",
            data: {
              personal: {status: "none"},
              enterprise: {status: "none"},
            },
          });
        }
        requestBody = JSON.parse(String(init?.body));
        return Response.json({
          code: 0,
          message: "success",
          data: {user: {id: 8, phone: "138****8000", roles: ["buyer"]}},
        });
      },
    );
    assert.deepEqual(requestBody, {
      phone: "13800138000",
      sms_code: "123456",
      agree_tos: true,
      remember: true,
    });
    assert.equal(result.id, "8");
    assert.deepEqual(result.roles, ["buyer"]);
  });

  it("treats an absent cookie session as signed out", async () => {
    const result = await currentAccountApi(async () =>
      Response.json({code: 40100, message: "未登录"}, {status: 401}),
    );
    assert.equal(result, null);
  });

  it("reads persisted KYC status for the current account", async () => {
    const requests: string[] = [];
    const result = await currentAccountApi(async (input) => {
      requests.push(String(input));
      if (String(input) === "/api/auth/me") {
        return Response.json({
          code: 0,
          message: "success",
          data: {id: 9, phone: "138****8000", roles: ["buyer"]},
        });
      }
      return Response.json({
        code: 0,
        message: "success",
        data: {
          personal: {status: "verified", real_name: "测试用户"},
          enterprise: {status: "none"},
        },
      });
    });

    assert.deepEqual(requests, ["/api/auth/me", "/api/auth/kyc/status"]);
    assert.equal(result?.verificationStatus, "verified");
  });

  it("submits personal KYC to the backend and returns the persisted account", async () => {
    const requests: Array<{path: string; body?: unknown}> = [];
    const result = await verifyAccountApi(
      {
        kind: "personal",
        legalName: "测试用户",
        identityNumber: "110101199001011234",
        faceVerified: true,
      },
      async (input, init) => {
        requests.push({
          path: String(input),
          body: init?.body ? JSON.parse(String(init.body)) : undefined,
        });
        if (String(input) === "/api/auth/kyc/personal") {
          return Response.json({code: 0, message: "提交成功"});
        }
        if (String(input) === "/api/auth/me") {
          return Response.json({
            code: 0,
            message: "success",
            data: {id: 9, phone: "138****8000", roles: ["buyer"]},
          });
        }
        return Response.json({
          code: 0,
          message: "success",
          data: {
            personal: {status: "verified", real_name: "测试用户"},
            enterprise: {status: "none"},
          },
        });
      },
    );

    assert.deepEqual(requests[0], {
      path: "/api/auth/kyc/personal",
      body: {real_name: "测试用户", id_card: "110101199001011234"},
    });
    assert.equal(result.verificationStatus, "verified");
  });

  it("maps enterprise KYC to the backend contract", async () => {
    let requestBody: unknown;
    await verifyAccountApi(
      {
        kind: "enterprise",
        companyName: "测试企业",
        creditCode: "91110000123456789X",
        representative: "测试法人",
        representativeIdNumber: "110101199001011234",
        businessLicenseFileName: "license.png",
        bankName: "测试银行",
        accountName: "测试企业",
        accountNumber: "1234567890",
      },
      async (input, init) => {
        if (String(input) === "/api/auth/kyc/enterprise") {
          requestBody = JSON.parse(String(init?.body));
          return Response.json({code: 0, message: "提交成功"});
        }
        if (String(input) === "/api/auth/me") {
          return Response.json({
            code: 0,
            message: "success",
            data: {id: 10, phone: "139****9000", roles: ["buyer"]},
          });
        }
        return Response.json({
          code: 0,
          message: "success",
          data: {
            personal: {status: "none"},
            enterprise: {status: "verified", name: "测试企业"},
          },
        });
      },
    );

    assert.deepEqual(requestBody, {
      enterprise_name: "测试企业",
      uscc: "91110000123456789X",
      license_url: "license.png",
      legal_person: "测试法人",
    });
  });
});
