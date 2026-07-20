import {NextResponse, type NextRequest} from "next/server";

/**
 * Temporary route lockdown while the landing page is built section by
 * section: `/` serves the landing page (rewrite, clean URL) and every
 * other application route bounces back to it. Remove this middleware to
 * reopen the app shell.
 */
export function middleware(request: NextRequest) {
  const {pathname} = request.nextUrl;

  if (pathname === "/") {
    return NextResponse.rewrite(new URL("/landing", request.url));
  }
  if (pathname === "/landing" || pathname.startsWith("/landing/")) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|compute-spot|images|fonts).*)",
  ],
};
