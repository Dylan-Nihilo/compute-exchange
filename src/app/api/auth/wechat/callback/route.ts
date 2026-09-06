import {cookies} from "next/headers";
import {NextResponse} from "next/server";
import {authTokens, postAuthBackend, setAuthCookies} from "@/lib/api/auth-backend";
import {readWeChatContext, weChatCookieOptions, weChatRequestOrigin, WECHAT_BIND_COOKIE, WECHAT_CONTEXT_COOKIE} from "@/lib/auth/wechat";

export async function GET(request: Request) {
 const url = new URL(request.url);
 const cookieStore = await cookies();
 const context = readWeChatContext(cookieStore.get(WECHAT_CONTEXT_COOKIE)?.value);
 const nextQuery = context?.next ? `&next=${encodeURIComponent(context.next)}` : "";
 const redirect = (path: string) => {
  const response = NextResponse.redirect(new URL(path, weChatRequestOrigin(request)));
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.cookies.set(WECHAT_CONTEXT_COOKIE, "", {...weChatCookieOptions, maxAge: 0});
  response.cookies.set(WECHAT_BIND_COOKIE, "", {...weChatCookieOptions, maxAge: 0});
  return response;
 };
 const failed = () => redirect(`/auth/login?wechat_error=expired${nextQuery}`);
 if (!context || !url.searchParams.get("code") || !url.searchParams.get("state")) return failed();
 try {
  const {payload, status} = await postAuthBackend("/auth/wechat/exchange", {
   code: url.searchParams.get("code"), state: url.searchParams.get("state"), browser_verifier: context.verifier,
  });
  if (status !== 200 || payload?.code !== 0) return failed();
  if (payload.data?.binding_required === true && /^[a-f0-9]{64}$/.test(payload.data.binding_ticket)) {
   const response = redirect(`/auth/wechat/bind?mode=login${nextQuery}`);
   response.cookies.set(WECHAT_BIND_COOKIE, payload.data.binding_ticket, weChatCookieOptions);
   return response;
  }
  const tokens = authTokens(payload);
  if (!tokens) return failed();
  const response = redirect(`/auth/login?wechat=success${nextQuery}`);
  setAuthCookies(response, tokens, context.remember);
  return response;
 } catch { return failed(); }
}
