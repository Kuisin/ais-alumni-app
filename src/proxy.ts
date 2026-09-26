import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Locale routing only. Authorization is enforced in layouts, pages and
// server actions (see src/lib/session.ts), never here.
export default createMiddleware(routing);

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
