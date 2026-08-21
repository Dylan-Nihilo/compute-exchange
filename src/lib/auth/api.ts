import {z} from "zod";

import {roleSchema} from "../domain/contracts.ts";
import type {SessionAccount} from "./service.ts";

const smsCodeEnvelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z
    .object({
      expires_in: z.number().int().positive(),
      resend_after: z.number().int().positive().optional(),
      preview_code: z.string().regex(/^[0-9]{6}$/).optional(),
    })
    .optional(),
});

const authUserSchema = z.object({
  id: z.number().int().positive(),
  phone: z.string().min(1),
  email: z.string().optional(),
  roles: z.array(roleSchema.exclude(["guest"])).min(1),
});

const sessionEnvelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z
    .object({
      user: authUserSchema,
    })
    .optional(),
});

const currentAccountEnvelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: authUserSchema.optional(),
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
  return {
    resendAfterSeconds:
      result.data.resend_after ?? Math.min(result.data.expires_in, 60),
    previewCode: result.data.preview_code,
  };
}

export async function smsLoginApi(
  input: {phoneNumber: string; code: string; remember: boolean},
  fetchImplementation: typeof fetch = fetch,
): Promise<SessionAccount> {
  const result = await post(
    "/api/auth/sms/login",
    {phone: input.phoneNumber, sms_code: input.code, remember: input.remember},
    sessionEnvelopeSchema,
    fetchImplementation,
  );
  if (!result.data) throw new Error("认证服务返回格式错误");
  return toSessionAccount(result.data.user);
}

export async function registerSmsApi(
  input: {
    phoneNumber: string;
    code: string;
    agreeTos: boolean;
    remember: boolean;
  },
  fetchImplementation: typeof fetch = fetch,
): Promise<SessionAccount> {
  const result = await post(
    "/api/auth/register",
    {
      phone: input.phoneNumber,
      sms_code: input.code,
      agree_tos: input.agreeTos,
      remember: input.remember,
    },
    sessionEnvelopeSchema,
    fetchImplementation,
  );
  if (!result.data) throw new Error("注册服务返回格式错误");
  return toSessionAccount(result.data.user);
}

export async function currentAccountApi(
  fetchImplementation: typeof fetch = fetch,
): Promise<SessionAccount | null> {
  const response = await fetchImplementation("/api/auth/me", {
    cache: "no-store",
  });
  const parsed = currentAccountEnvelopeSchema.safeParse(
    await response.json().catch(() => null),
  );
  if (response.status === 401) return null;
  if (!parsed.success) throw new Error("认证服务返回格式错误");
  if (!response.ok || parsed.data.code !== 0 || !parsed.data.data) {
    throw new Error(parsed.data.message || "账户状态读取失败");
  }
  return toSessionAccount(parsed.data.data);
}

export async function logoutApi(fetchImplementation: typeof fetch = fetch) {
  const response = await fetchImplementation("/api/auth/logout", {method: "POST"});
  const payload = (await response.json().catch(() => null)) as {
    code?: unknown;
    message?: unknown;
  } | null;
  if (!response.ok || payload?.code !== 0) {
    throw new Error(
      typeof payload?.message === "string" ? payload.message : "退出登录失败",
    );
  }
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

function toSessionAccount(user: z.infer<typeof authUserSchema>): SessionAccount {
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
