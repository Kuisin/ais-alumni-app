import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Locale routing only. Authorization is enforced in layouts, pages and
// server actions (see src/lib/session.ts), never here.
export default createMiddleware(routing);

export const config = {
  // /n/<token>: notification short links (no locale).
  matcher: "/((?!api|n/|_next|_vercel|.*\\..*).*)",
};
