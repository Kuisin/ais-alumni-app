import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

type Href = { pathname: string; query: Record<string, string> };

/**
 * Previous / next links with a "page x of y" (or any) status in between.
 * Pass null for a direction that has no page; the slot stays so the layout
 * doesn't jump.
 */
export function PageNav({
  label,
  prev,
  next,
  prevLabel,
  nextLabel,
  status,
}: {
  label: string;
  prev: Href | null;
  next: Href | null;
  prevLabel: string;
  nextLabel: string;
  status?: ReactNode;
}) {
  if (!prev && !next) return null;
  return (
    <nav
      aria-label={label}
      className="mt-4 flex items-center justify-between gap-2"
    >
      {prev ? (
        <Link href={prev} rel="prev" className={buttonClass("secondary")}>
          <ChevronLeft aria-hidden="true" className="size-4" />
          {prevLabel}
        </Link>
      ) : (
        <span />
      )}
      {status ? (
        <span className="text-sm text-slate-600 tabular-nums">{status}</span>
      ) : null}
      {next ? (
        <Link href={next} rel="next" className={buttonClass("secondary")}>
          {nextLabel}
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

/** Parse ?page= into a positive integer (default 1). */
export function pageParam(value: string | string[] | undefined): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n >= 1 && n <= 10_000 ? n : 1;
}
