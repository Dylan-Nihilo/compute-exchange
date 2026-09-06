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
        if (String(input) === "/api/auth/me") {
          return Response.json({
            code: 0,
            message: "success",
            data: {id: 7, phone: "138****8000", roles: ["buyer"]},
          });
        }
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
        if (String(input) === "/api/auth/me") {
          return Response.json({
            code: 0,
            message: "success",
            data: {id: 8, phone: "138****8000", roles: ["buyer"]},
          });
        }
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
      terms_version: "2026-09-06.1",
      privacy_version: "2026-09-06.1",
      remember: true,
    });
    assert.equal(result.id, "8");
    assert.deepEqual(result.roles, ["buyer"]);
  });

  it("never combines a newly registered account with another cookie session", async () => {
    await assert.rejects(
      registerSmsApi(
        {
          phoneNumber: "18800001992",
          code: "123456",
          agreeTos: true,
          remember: true,
        },
        async (input) => {
          if (String(input) === "/api/auth/register") {
            return Response.json({
              code: 0,
              message: "success",
              data: {user: {id: 17, phone: "188****1992", roles: ["buyer"]}},
            });
          }
          if (String(input) === "/api/auth/me") {
            return Response.json({
              code: 0,
              message: "success",
              data: {id: 5, phone: "182****6753", roles: ["buyer"]},
            });
          }
          return Response.json({
            code: 0,
            message: "success",
            data: {
              personal: {status: "none"},
              enterprise: {status: "verified"},
            },
          });
        },
      ),
      /浏览器会话属于其他账户/,
    );
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
      "9",
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

    assert.deepEqual(requests.find(({path}) => path === "/api/auth/kyc/personal"), {
      path: "/api/auth/kyc/personal",
      body: {real_name: "测试用户", id_card: "110101199001011234"},
    });
    assert.equal(result.verificationStatus, "verified");
  });

  it("maps enterprise KYC to the backend contract", async () => {
    let requestBody: BodyInit | null | undefined;
    const businessLicense = new File(["license-content"], "license.png", {
      type: "image/png",
    });
    await verifyAccountApi(
      {
        kind: "enterprise",
        companyName: "测试企业",
        creditCode: "91110000123456789X",
        representative: "测试法人",
        representativeIdNumber: "110101199001011234",
        businessLicenseFileName: "license.png",
        businessLicenseFile: businessLicense,
        bankName: "测试银行",
        accountName: "测试企业",
        accountNumber: "1234567890",
      },
      "10",
      async (input, init) => {
        if (String(input) === "/api/auth/kyc/enterprise") {
          requestBody = init?.body;
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

    assert.ok(requestBody instanceof FormData);
    assert.equal(requestBody.get("enterprise_name"), "测试企业");
    assert.equal(requestBody.get("uscc"), "91110000123456789X");
    assert.equal(requestBody.get("legal_person"), "测试法人");
    assert.equal(requestBody.get("legal_person_id_card"), "110101199001011234");
    assert.equal(requestBody.get("bank_name"), "测试银行");
    assert.equal(requestBody.get("bank_account_name"), "测试企业");
    assert.equal(requestBody.get("bank_account_number"), "1234567890");
    const uploaded = requestBody.get("business_license");
    assert.ok(uploaded instanceof File);
    assert.equal(uploaded.name, "license.png");
    assert.equal(await uploaded.text(), "license-content");
  });

  it("returns actionable enterprise field validation before sending", async () => {
    let requests = 0;
    const unexpectedFetch: typeof fetch = async () => {
      requests += 1;
      return Response.json({code: 0, message: "unexpected"});
    };
    const validInput = {
      kind: "enterprise" as const,
      companyName: "测试企业",
      creditCode: "91110000123456789X",
      representative: "测试法人",
      representativeIdNumber: "110101199001011234",
      businessLicenseFileName: "license.png",
      bankName: "测试银行",
      accountName: "测试企业",
      accountNumber: "1234567890",
    };

    await assert.rejects(
      verifyAccountApi(
        {...validInput, representativeIdNumber: "123"},
        "10",
        unexpectedFetch,
      ),
      /证件号需为 15 位数字，或 18 位且末位可为 X/,
    );
    await assert.rejects(
      verifyAccountApi({...validInput, accountNumber: "12"}, "10", unexpectedFetch),
      /银行账号需为 8–32 位数字/,
    );
    assert.equal(requests, 0);
  });
});

it("binds WeChat after SMS authentication and preserves the existing supplier account", async () => {
  const paths: string[] = [];
  const user = {id: 7, phone: "138****8000", roles: ["buyer", "supplier"]};
  const fetcher: typeof fetch = async (input, init) => {
    paths.push(String(input));
    if (String(input) === "/api/auth/wechat/bind") {
      assert.deepEqual(JSON.parse(String(init?.body)), {});
      return Response.json({code: 0, message: "success"});
    }
    if (String(input) === "/api/auth/me") return Response.json({code: 0, message: "success", data: user});
    if (String(input) === "/api/auth/kyc/status") return Response.json({code: 0, message: "success", data: {personal: {status: "none"}, enterprise: {status: "verified"}}});
    return Response.json({code: 0, message: "success", data: {user}});
  };
  const account = await smsLoginApi({phoneNumber: "13800138000", code: "123456", remember: true, wechatBinding: true}, fetcher);
  assert.equal(account.id, "7");
  assert.deepEqual(account.roles, ["buyer", "supplier"]);
  assert.deepEqual(paths, ["/api/auth/sms/login", "/api/auth/wechat/bind", "/api/auth/me", "/api/auth/kyc/status"]);
  await assert.rejects(registerSmsApi({phoneNumber: "13800138000", code: "123456", agreeTos: true, remember: true, wechatBinding: true}, async (input) => {
    if (String(input) === "/api/auth/wechat/bind") return Response.json({code: 40900, message: "微信已绑定其他账户"});
    return Response.json({code: 0, message: "success", data: {user}});
  }), /微信已绑定其他账户/);
});
