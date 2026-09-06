import {randomBytes} from "node:crypto";
import {NextResponse} from "next/server";
import {postAuthBackend, requestAuthBackend} from "@/lib/api/auth-backend";
import {safeNextPath} from "@/lib/auth/session";
import {sameOriginRequest, weChatAuthorizationUrl, weChatCookieOptions, WECHAT_BIND_COOKIE, WECHAT_CONTEXT_COOKIE} from "@/lib/auth/wechat";

export async function GET() {
 try {
  const {payload, status} = await requestAuthBackend("/auth/wechat/status", {method: "GET"});
  return NextResponse.json(payload, {status, headers: {"Cache-Control": "no-store"}});
 } catch { return NextResponse.json({code: 50000, message: "微信登录暂不可用"}, {status: 502}); }
}

export async function POST(request: Request) {
 if (!sameOriginRequest(request)) return NextResponse.json({code: 40300, message: "请求来源无效"}, {status: 403});
 try {
  const body = await request.json();
  const verifier = randomBytes(32).toString("hex");
  const {payload, status} = await postAuthBackend("/auth/wechat/start", {browser_verifier: verifier});
  if (status !== 200 || payload?.code !== 0) return NextResponse.json(payload, {status});
  const authorizeUrl = weChatAuthorizationUrl(payload.data?.authorize_url);
  const response = NextResponse.json({code: 0, message: "success", data: {authorize_url: authorizeUrl}}, {headers: {"Cache-Control": "no-store"}});
  response.cookies.set(WECHAT_CONTEXT_COOKIE, JSON.stringify({verifier, next: safeNextPath(body.next), remember: body.remember === true}), weChatCookieOptions);
  response.cookies.set(WECHAT_BIND_COOKIE, "", {...weChatCookieOptions, maxAge: 0});
  return response;
 } catch { return NextResponse.json({code: 50000, message: "微信登录暂不可用"}, {status: 502}); }
}
