import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {registerSmsApi, requestSmsCodeApi, smsLoginApi} from "./api.ts";

describe("authentication API adapter", () => {
  it("passes the untouched Cap token to the SMS endpoint and checks business code", async () => {
    let requestBody: unknown;
    const fetchImplementation: typeof fetch = async (_input, init) => {
      requestBody = JSON.parse(String(init?.body));
      return Response.json({
        code: 0,
        message: "success",
        data: {expires_in: 300},
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
    assert.equal(result.resendAfterSeconds, 300);

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
      async (_input, init) => {
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
  });

  it("submits the backend registration contract", async () => {
    let requestBody: unknown;
    const result = await registerSmsApi(
      {phoneNumber: "13800138000", code: "123456", password: "Abc12345!"},
      async (_input, init) => {
        requestBody = JSON.parse(String(init?.body));
        return Response.json({
          code: 0,
          message: "success",
          data: {user_id: 8},
        });
      },
    );
    assert.deepEqual(requestBody, {
      phone: "13800138000",
      sms_code: "123456",
      password: "Abc12345!",
      agree_tos: true,
    });
    assert.equal(result.userId, "8");
  });
});
