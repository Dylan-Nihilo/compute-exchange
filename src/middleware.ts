import {NextResponse, type NextRequest} from "next/server.js";

import {legalDocuments} from "./lib/legal.ts";

const SESSION_COOKIE_NAMES = [
  "omnis_access_token",
  "omnis_refresh_token",
] as const;
const PROTECTED_ROUTES = [
  "/console",
  "/admin",
  "/auth/verify",
  "/auth/identity",
  "/supplier/apply",
  "/checkout",
  // 市场列表与业务板块页均需登录后浏览(未登录引导到 /auth/login?next=…)。
  // 注: /leasing 因易宝支付入网合规于 2026-09-21 整体下线(见下方 allowlist), 不在此列。
  "/market",
  "/equipment-market",
  "/broker",
] as const;

/**
 * Temporary route lockdown while the landing page is built section by
 * section: `/` serves the landing page (rewrite, clean URL) and every
 * other application route bounces back to it. Public market and account-entry
 * routes stay available for product review while the rest remains locked.
 */
export function middleware(request: NextRequest) {
  const {pathname, search} = request.nextUrl;

  if (process.env.NODE_ENV !== "production" && pathname.startsWith("/dev/")) {
    return NextResponse.next();
  }
  if (pathname === "/") {
    return NextResponse.rewrite(new URL("/landing", request.url));
  }
  if (isProtectedRoute(pathname) && !hasSessionCookie(request)) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }
  if (
    Object.hasOwn(legalDocuments, pathname.slice(1)) ||
    pathname === "/attestations/verify" ||
    // 易宝支付入网合规(2026-09-21): /leasing 移出 allowlist → 访问一律弹回首页。
    // 页面代码保留(components/leads/leasing-*), 恢复业务时把它加回本清单与 PROTECTED_ROUTES。
    pathname === "/broker" ||
    pathname.startsWith("/broker/") ||
    pathname === "/landing" ||
    pathname.startsWith("/landing/") ||
    pathname === "/market" ||
    pathname.startsWith("/market/") ||
    pathname === "/equipment-market" ||
    pathname.startsWith("/equipment-market/") ||
    pathname === "/checkout" ||
    pathname.startsWith("/checkout/") ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/") ||
    pathname === "/supplier" ||
    pathname.startsWith("/supplier/") ||
    pathname === "/console" ||
    pathname.startsWith("/console/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/unauthorized"
  ) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL("/", request.url));
}

function isProtectedRoute(pathname: string) {
  return PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function hasSessionCookie(request: NextRequest) {
  return SESSION_COOKIE_NAMES.some((name) => request.cookies.has(name));
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|brand|compute-spot|images|fonts).*)",
  ],
};
