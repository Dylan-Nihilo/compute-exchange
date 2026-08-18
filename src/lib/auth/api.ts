import {z} from "zod";

import {roleSchema} from "../domain/contracts.ts";
import type {SessionAccount} from "./service.ts";

const smsCodeEnvelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z.object({expires_in: z.number().int().positive()}).optional(),
});

const smsLoginEnvelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z
    .object({
      user: z.object({
        id: z.number().int().positive(),
        phone: z.string().min(1),
        email: z.string().optional(),
        roles: z.array(roleSchema.exclude(["guest"])).min(1),
      }),
    })
    .optional(),
});

const registerEnvelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z.object({user_id: z.number().int().positive()}).optional(),
});

export async function requestSmsCodeApi(
  input: {
    phoneNumber: string;
    purpose: "login" | "register";
    captchaToken: string;
  },
  fetchImplementation: typeof fetch = fetch,
) {
  const result = await post(
    "/api/auth/sms/code",
    {
      phone: input.phoneNumber,
      purpose: input.purpose,
      captcha_token: input.captchaToken,
    },
    smsCodeEnvelopeSchema,
    fetchImplementation,
  );
  if (!result.data) throw new Error("短信服务返回格式错误");
  return {resendAfterSeconds: result.data.expires_in};
}

export async function smsLoginApi(
  input: {phoneNumber: string; code: string; remember: boolean},
  fetchImplementation: typeof fetch = fetch,
): Promise<SessionAccount> {
  const result = await post(
    "/api/auth/sms/login",
    {phone: input.phoneNumber, sms_code: input.code, remember: input.remember},
    smsLoginEnvelopeSchema,
    fetchImplementation,
  );
  if (!result.data) throw new Error("认证服务返回格式错误");
  const {user} = result.data;
  return {
    id: String(user.id),
    displayName: user.phone,
    email: user.email ?? "",
    phoneNumber: user.phone,
    roles: user.roles,
    verificationStatus: "unverified",
    grants: [],
  };
}

export async function registerSmsApi(
  input: {phoneNumber: string; code: string; password: string},
  fetchImplementation: typeof fetch = fetch,
) {
  const result = await post(
    "/api/auth/register",
    {
      phone: input.phoneNumber,
      sms_code: input.code,
      password: input.password,
      agree_tos: true,
    },
    registerEnvelopeSchema,
    fetchImplementation,
  );
  if (!result.data) throw new Error("注册服务返回格式错误");
  return {userId: String(result.data.user_id)};
}

async function post<T extends {code: number; message: string}>(
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
  fetchImplementation: typeof fetch,
): Promise<T> {
  const response = await fetchImplementation(path, {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify(body),
  });
  const parsed = schema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new Error("认证服务返回格式错误");
  if (!response.ok || parsed.data.code !== 0) {
    throw new Error(parsed.data.message || "操作未完成，请重试");
  }
  return parsed.data;
}
