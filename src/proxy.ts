import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "pos_session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // This is only a lightweight redirect gate. Final authorization still
  // happens in server-side auth checks (`getCurrentSession()` /
  // `requireAuthContext()`), which validate the token, expiry, user state,
  // organization and active membership before granting access.
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