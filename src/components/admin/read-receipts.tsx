import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

/** Whole-number share of read / total (0 when there is no one to read). */
export function readPercent(read: number, total: number): number {
  return total > 0 ? Math.min(100, Math.round((read / total) * 100)) : 0;
}

/**
 * "既読 N / M" with its percentage and a slim bar. The text carries the
 * numbers; the bar is decorative. `lg` is the big headline variant.
 */
export function ReadMeter({
  read,
  total,
  label,
  percentLabel,
  size = "sm",
  className,
}: {
  read: number;
  total: number;
  /** e.g. "既読 3 / 10" */
  label: string;
  /** e.g. "30%" */
  percentLabel: string;
  size?: "sm" | "lg";
  className?: string;
}) {
  const pct = readPercent(read, total);
  const lg = size === "lg";
  return (
    <div className={cn(lg ? "space-y-2" : "space-y-1", className)}>
      <p
        className={cn(
          "flex flex-wrap items-baseline gap-x-2 tabular-nums",
          lg ? "text-2xl font-bold text-slate-900" : "text-xs font-medium",
        )}
      >
        <span>{label}</span>
        <span
          className={cn(
            "font-normal text-slate-500",
            lg ? "text-base" : "text-xs",
          )}
        >
          {percentLabel}
        </span>
      </p>
      <div
        aria-hidden="true"
        className={cn(
          "w-full overflow-hidden rounded-full bg-slate-100",
          lg ? "h-3" : "h-1.5",
        )}
      >
        <div
          className={cn(
            "h-full rounded-full",
            pct === 100 ? "bg-green-600" : "bg-brand-700",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export type ReceiptItem = {
  key: string;
  name: string;
  /** read time (already formatted), shown at the end of the row */
  time?: { label: string; iso: string };
};

/**
 * A list of members; after `limit` rows the rest sit in a <details>
 * ("すべて表示") so long lists stay short on phones.
 */
export function ReceiptList({
  items,
  moreLabel,
  empty,
  limit = 20,
}: {
  items: ReceiptItem[];
  /** summary text for the hidden rows, e.g. "すべて表示（ほか12人）" */
  moreLabel: string;
  empty: ReactNode;
  limit?: number;
}) {
  if (items.length === 0) {
    return <p className="py-2 text-sm text-slate-500">{empty}</p>;
  }
  const shown = items.slice(0, limit);
  const rest = items.slice(limit);
  return (
    <div>
      <Rows items={shown} />
      {rest.length ? (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 rounded text-sm font-medium text-brand-700 hover:text-brand-800 hover:underline [&::-webkit-details-marker]:hidden">
            <ChevronDown
              aria-hidden="true"
              className="size-4 transition-transform group-open:rotate-180"
            />
            {moreLabel}
          </summary>
          <Rows items={rest} />
        </details>
      ) : null}
    </div>
  );
}

function Rows({ items }: { items: ReceiptItem[] }) {
  return (
    <ul className="divide-y divide-slate-100 text-sm">
      {items.map((i) => (
        <li
          key={i.key}
          className="flex flex-wrap items-baseline justify-between gap-x-3 py-2"
        >
          <span className="min-w-0 break-words text-slate-900">{i.name}</span>
          {i.time ? (
            <time
              dateTime={i.time.iso}
              className="shrink-0 text-xs text-slate-500 tabular-nums"
            >
              {i.time.label}
            </time>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
