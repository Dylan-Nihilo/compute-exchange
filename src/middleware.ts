import {NextResponse, type NextRequest} from "next/server.js";

const SESSION_COOKIE_NAMES = [
  "omnis_access_token",
  "omnis_refresh_token",
] as const;
const PROTECTED_ROUTES = [
  "/console",
  "/admin",
  "/auth/verify",
  "/auth/identity",
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
    pathname === "/landing" ||
    pathname.startsWith("/landing/") ||
    pathname === "/market" ||
    pathname.startsWith("/market/") ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/") ||
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
