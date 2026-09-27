import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "./cn";
import { LinkPendingBar } from "./link-pending";

export type TabItem = {
  href: ComponentProps<typeof Link>["href"];
  label: string;
  /** optional count shown as a small badge after the label */
  count?: number;
  active: boolean;
};

/**
 * Underline tabs as plain links (server-friendly: state lives in the URL).
 * The active tab gets aria-current="page".
 */
export function Tabs({
  items,
  label,
  className,
}: {
  items: TabItem[];
  /** accessible name of the tab navigation */
  label: string;
  className?: string;
}) {
  return (
    <nav
      aria-label={label}
      className={cn(
        "flex gap-1 overflow-x-auto border-b border-slate-200",
        className,
      )}
    >
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "relative -mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
            item.active
              ? "border-brand-700 text-brand-800"
              : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900",
          )}
        >
          {item.label}
          {item.count !== undefined ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs tabular-nums",
                item.active
                  ? "bg-brand-100 text-brand-800"
                  : "bg-slate-100 text-slate-600",
              )}
            >
              {item.count}
            </span>
          ) : null}
          {/* covers the underline of the tab being opened */}
          <LinkPendingBar className="inset-x-0 -bottom-0.5 bg-brand-700" />
        </Link>
      ))}
    </nav>
  );
}
