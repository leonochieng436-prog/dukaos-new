import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "pos_session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect dashboard routes.
  if (pathname.startsWith("/dashboard")) {
    const hasSessionCookie = request.cookies.has(SESSION_COOKIE);

    if (!hasSessionCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);

      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};