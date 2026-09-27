"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/components/ui/cn";
import { LinkPendingBar } from "@/components/ui/link-pending";
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
  scrollIntoViewIfActive = false,
  also = [],
}: {
  href: string;
  children: ReactNode;
  className?: string;
  activeClassName?: string;
  /** keep the current item visible in a horizontally scrolling nav */
  scrollIntoViewIfActive?: boolean;
  /** other sections this item stands for (マイページ: follows, settings, …) */
  also?: string[];
}) {
  const pathname = usePathname();
  const active = [href, ...also].some((h) => isActive(pathname, h));
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (!active || !scrollIntoViewIfActive) return;
    const el = ref.current;
    const row = el?.closest<HTMLElement>(".overflow-x-auto");
    // Only when the row actually scrolls (phones), never the page.
    if (el && row && row.scrollWidth > row.clientWidth) {
      const offset =
        el.getBoundingClientRect().left - row.getBoundingClientRect().left;
      row.scrollLeft += offset - (row.clientWidth - el.offsetWidth) / 2;
    }
  }, [active, scrollIntoViewIfActive]);
  return (
    <Link
      ref={ref}
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn("relative", className, active && activeClassName)}
    >
      {children}
      <LinkPendingBar />
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
  // Close on a tap outside or Escape, like a menu.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onPointer = (e: PointerEvent) => {
      if (el.open && !el.contains(e.target as Node)) el.open = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !el.open) return;
      el.open = false;
      el.querySelector("summary")?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
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
