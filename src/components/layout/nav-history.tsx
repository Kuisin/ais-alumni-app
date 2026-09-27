"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";

// Pages shown in this tab since the app loaded (client navigations). A
// module value, so a full reload starts again at 0.
let depth = 0;

/** Counts in-app navigations; rendered once by the app shell. */
export function NavTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) depth += 1;
  }, [pathname]);
  return null;
}

/** True when the previous history entry is a page of this app. */
export function canGoBackInApp(): boolean {
  return depth > 1;
}
