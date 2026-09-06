import {z} from "zod";
import {safeNextPath} from "./session.ts";

export const WECHAT_CONTEXT_COOKIE = "omnis_wechat_context";
export const WECHAT_BIND_COOKIE = "omnis_wechat_binding";
export const weChatCookieOptions = {
 httpOnly: true,
 sameSite: "lax" as const,
 secure: process.env.NODE_ENV === "production",
 path: "/",
 maxAge: 600,
};

const contextSchema = z.object({verifier: z.string().regex(/^[a-f0-9]{64}$/), next: z.string().nullable().optional(), remember: z.boolean()});
export function readWeChatContext(raw: string | undefined) {
 try {
  const value = contextSchema.parse(JSON.parse(raw ?? ""));
  return {...value, next: safeNextPath(value.next)};
 } catch { return null; }
}

export function weChatAuthorizationUrl(value: unknown) {
 if (typeof value !== "string") throw new Error("微信登录服务返回格式错误");
 const url = new URL(value);
 if (url.origin !== "https://open.weixin.qq.com" || url.pathname !== "/connect/qrconnect" || url.username || url.password || url.searchParams.get("scope") !== "snsapi_login" || !/^[a-f0-9]{64}$/.test(url.searchParams.get("state") ?? "")) throw new Error("微信登录地址无效");
 return url.href;
}

export function sameOriginRequest(request: Request) {
 const origin = request.headers.get("origin");
 if (!origin) return false;
 try {
  return origin === weChatRequestOrigin(request);
 } catch { return false; }
}

// Caddy preserves Host and supplies X-Forwarded-Proto; Next.js sees an internal URL.
export function weChatRequestOrigin(request: Request) {
 const internal = new URL(request.url);
 const protocol = request.headers.get("x-forwarded-proto") === "https" ? "https:" : internal.protocol;
 const host = request.headers.get("host") ?? internal.host;
 const external = new URL(`${protocol}//${host}`);
 if (external.host !== host || external.username || external.password) throw new Error("Invalid request host");
 return external.origin;
}
