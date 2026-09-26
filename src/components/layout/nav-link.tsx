"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/components/ui/cn";
import { Link, usePathname } from "@/i18n/navigation";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Nav link that marks itself as the current page. */
export function NavLink({
  href,
  children,
  className,
  activeClassName,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  activeClassName?: string;
}) {
  const active = isActive(usePathname(), href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(className, active && activeClassName)}
    >
      {children}
    </Link>
  );
}

/** A <details> dropdown that closes itself after navigating. */
export function Dropdown({
  summary,
  summaryClassName,
  children,
  className,
}: {
  summary: ReactNode;
  summaryClassName?: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    if (ref.current && pathname) ref.current.open = false;
  }, [pathname]);
  return (
    <details ref={ref} className={cn("relative", className)}>
      <summary className={cn("cursor-pointer list-none", summaryClassName)}>
        {summary}
      </summary>
      <div className="animate-fade absolute right-0 z-50 mt-1 w-64 rounded-xl border border-slate-200 bg-white p-2 text-slate-900 shadow-lg">
        {children}
      </div>
    </details>
  );
}
