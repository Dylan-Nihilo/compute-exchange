import {cookies} from "next/headers";
import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";
import {sameOriginRequest, weChatCookieOptions, WECHAT_BIND_COOKIE} from "@/lib/auth/wechat";

export async function POST(request: Request) {
 if (!sameOriginRequest(request)) return Response.json({code: 40300, message: "请求来源无效"}, {status: 403});
 const ticket = (await cookies()).get(WECHAT_BIND_COOKIE)?.value;
 if (!ticket || !/^[a-f0-9]{64}$/.test(ticket)) return Response.json({code: 40100, message: "微信授权已失效，请返回登录页重新扫码"}, {status: 401});
 const response = await proxyAuthenticatedBackend("/auth/wechat/bind", {
  method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({binding_ticket: ticket}),
 });
 response.headers.set("Cache-Control", "no-store");
 response.cookies.set(WECHAT_BIND_COOKIE, "", {...weChatCookieOptions, maxAge: 0});
 return response;
}
