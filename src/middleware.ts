import {NextResponse, type NextRequest} from "next/server";

/**
 * Temporary route lockdown while the landing page is built section by
 * section: `/` serves the landing page (rewrite, clean URL) and every
 * other application route bounces back to it. Public market and account-entry
 * routes stay available for product review while the rest remains locked.
 */
export function middleware(request: NextRequest) {
  const {pathname} = request.nextUrl;

  if (pathname === "/") {
    return NextResponse.rewrite(new URL("/landing", request.url));
  }
  if (
    pathname === "/landing" ||
    pathname.startsWith("/landing/") ||
    pathname === "/market" ||
    pathname.startsWith("/market/") ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/")
  ) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|brand|compute-spot|images|fonts).*)",
  ],
};
