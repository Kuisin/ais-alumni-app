import { NextRequest, type NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NEXT_PATH_HEADER } from "./lib/next-path";

const intl = createMiddleware(routing);

// Locale routing only. Authorization is enforced in layouts, pages and
// server actions (see src/lib/session.ts), never here. Page requests also
// carry their path (x-ais-path) so the sign-in redirect can return to it.
export default function proxy(request: NextRequest): NextResponse {
  if (request.method !== "GET") return intl(request);
  const headers = new Headers(request.headers);
  headers.set(
    NEXT_PATH_HEADER,
    request.nextUrl.pathname + request.nextUrl.search,
  );
  return intl(new NextRequest(request.url, { headers }));
}

export const config = {
  // /n/<member code>/<token>: notification short links (no locale).
  matcher: "/((?!api|n/|_next|_vercel|.*\\..*).*)",
};
