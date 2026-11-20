import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, expectedToken } from "./lib/auth";

export const config = {
  // Guard everything except the login page, the auth API, and static assets.
  matcher: ["/((?!login|privacy|api/auth|_next/static|_next/image|manifest.json|icons|favicon.ico).*)"],
};

export async function middleware(req: NextRequest) {
  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  const expected = await expectedToken();

  const authed = expected !== null && cookie === expected;
  if (authed) return NextResponse.next();

  // API calls get a 401 so the client can redirect; page requests redirect.
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}
