import type { ReactNode } from "react";
import { Card } from "./card";
import { cn } from "./cn";
import { LoadingLabel } from "./loading-label";

// Loading placeholders for loading.tsx files. Each one mirrors the classes of
// the component it stands in for (Card, PageHeader, Tabs, EventCard, …) so
// the page swaps in without the layout jumping.

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** A grey placeholder block; size and shape it with className. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse bg-slate-200",
        // cn() doesn't merge classes: only default the radius when none given
        !/(^|\s)rounded(-|\s|$)/.test(className ?? "") && "rounded-md",
        className,
      )}
    />
  );
}

/**
 * Root of a loading screen: announced once as 「読み込み中…」 and faded in
 * after a short delay, so quick navigations never flash a skeleton.
 */
export function PageSkeleton({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a page-sized loading region, not a form <output>
    <div
      role="status"
      aria-busy="true"
      className={cn("animate-skeleton", className)}
    >
      <LoadingLabel />
      {children}
    </div>
  );
}

/** Stands in for <BackLink>. */
export function BackLinkSkeleton() {
  return (
    <div className="mb-2 flex min-h-11 items-center">
      <Skeleton className="h-4 w-24" />
    </div>
  );
}

/** Stands in for <PageHeader> (optionally with a <BackLink> above it). */
export function HeaderSkeleton({
  back = false,
  description = false,
  actions = 0,
}: {
  back?: boolean;
  description?: boolean;
  /** number of action buttons on the right */
  actions?: number;
}) {
  return (
    <>
      {back ? <BackLinkSkeleton /> : null}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="w-full max-w-sm">
          <Skeleton className="h-8 w-44" />
          {description ? <Skeleton className="mt-2 h-4 w-full" /> : null}
        </div>
        {actions > 0 ? (
          <div className="flex flex-wrap gap-2">
            {range(actions).map((i) => (
              <Skeleton key={i} className="h-11 w-28 rounded-lg" />
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}

const LINE_WIDTHS = ["w-full", "w-11/12", "w-4/5", "w-full", "w-3/4"];

/** Lines of body text; the last one is shorter. */
export function LinesSkeleton({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {range(lines).map((i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 && lines > 1
              ? "w-2/3"
              : LINE_WIDTHS[i % LINE_WIDTHS.length],
          )}
        />
      ))}
    </div>
  );
}

/** A <Card> with a heading and text lines (or custom content). */
export function CardSkeleton({
  title = true,
  lines = 3,
  className,
  children,
}: {
  title?: boolean;
  lines?: number;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Card className={className}>
      {title ? <Skeleton className="mb-4 h-6 w-40" /> : null}
      {children ?? <LinesSkeleton lines={lines} />}
    </Card>
  );
}

/** Stands in for <Tabs>. */
export function TabsSkeleton({
  count = 3,
  className = "mb-4",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-1 border-b border-slate-200", className)}>
      {range(count).map((i) => (
        <div key={i} className="flex min-h-11 items-center px-3">
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Row of pill links / filter chips. */
export function PillsSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {range(count).map((i) => (
        <Skeleton key={i} className="h-9 w-24 rounded-full" />
      ))}
    </div>
  );
}

/** Linked item cards, like EventCard and NewsCard. */
export function ItemListSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {range(count).map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-5 w-2/3" />
            <Skeleton className="mt-3 h-4 w-1/2" />
          </div>
          <Skeleton className="size-5 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Grid of MemberCards. */
export function MemberGridSkeleton({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid auto-rows-fr gap-3 sm:grid-cols-2", className)}>
      {range(count).map((i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
        >
          <Skeleton className="size-12 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 pt-1">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-2 h-3.5 w-1/2" />
            <Skeleton className="mt-2 h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * A divided list. `framed` draws its own bordered box (list pages); leave it
 * off inside a card.
 */
export function RowsSkeleton({
  rows = 5,
  avatar = false,
  framed = true,
  className,
}: {
  rows?: number;
  avatar?: boolean;
  framed?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "divide-y divide-slate-100",
        framed && "rounded-xl border border-slate-200 bg-white shadow-sm",
        className,
      )}
    >
      {range(rows).map((i) => (
        <div
          key={i}
          className={cn("flex items-center gap-3 py-3", framed && "px-4")}
        >
          {avatar ? (
            <Skeleton className="size-10 shrink-0 rounded-full" />
          ) : null}
          <div className="min-w-0 flex-1">
            <Skeleton className={cn("h-4", i % 2 ? "w-2/5" : "w-1/3")} />
            <Skeleton className={cn("mt-2 h-3.5", i % 2 ? "w-3/5" : "w-1/2")} />
          </div>
          <Skeleton className="h-4 w-12 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Labelled inputs and a submit button. */
export function FormSkeleton({
  fields = 3,
  submit = true,
  className,
}: {
  fields?: number;
  submit?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {range(fields).map((i) => (
        <div key={i}>
          <Skeleton className={cn("h-4", i % 2 ? "w-20" : "w-28")} />
          <Skeleton className="mt-2 h-11 w-full rounded-lg" />
        </div>
      ))}
      {submit ? <Skeleton className="h-11 w-32 rounded-lg" /> : null}
    </div>
  );
}

/** Search / filter form: a row of inputs and a button. */
export function FilterSkeleton({
  fields = 3,
  className = "mb-6",
}: {
  fields?: number;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
        {range(fields).map((i) => (
          <Skeleton key={i} className="h-11 rounded-lg" />
        ))}
      </div>
      <Skeleton className="mt-3 h-11 w-28 rounded-lg" />
    </Card>
  );
}

/** One search input and its button. */
export function SearchSkeleton({ className = "mb-4" }: { className?: string }) {
  return (
    <div className={cn("flex gap-2", className)}>
      <Skeleton className="h-11 flex-1 rounded-lg" />
      <Skeleton className="h-11 w-24 rounded-lg" />
    </div>
  );
}

const STAT_COLS: Record<number, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
};

/** Row of number cards. */
export function StatsSkeleton({
  count = 3,
  className,
}: {
  count?: 2 | 3 | 4;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4", STAT_COLS[count], className)}>
      {range(count).map((i) => (
        <Card key={i}>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-8 w-16" />
        </Card>
      ))}
    </div>
  );
}

const BAR_WIDTHS = ["w-full", "w-4/5", "w-3/5", "w-1/2", "w-1/3", "w-1/4"];

/** A card of labelled horizontal bars (BarTable). */
export function BarsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <CardSkeleton>
      <div className="space-y-3">
        {range(rows).map((i) => (
          <div key={i} className="grid grid-cols-[6rem_1fr] items-center gap-3">
            <Skeleton className="h-4" />
            <Skeleton
              className={cn("h-4", BAR_WIDTHS[i % BAR_WIDTHS.length])}
            />
          </div>
        ))}
      </div>
    </CardSkeleton>
  );
}

/** A table with a header row. */
export function TableSkeleton({
  rows = 8,
  cols = 5,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  const grid = { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` };
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm",
        className,
      )}
    >
      <div className="grid gap-4 bg-slate-50 px-4 py-3" style={grid}>
        {range(cols).map((i) => (
          <Skeleton key={i} className="h-3.5 w-2/3" />
        ))}
      </div>
      {range(rows).map((r) => (
        <div
          key={r}
          className="grid gap-4 border-t border-slate-100 px-4 py-3"
          style={grid}
        >
          {range(cols).map((c) => (
            <Skeleton
              key={c}
              className={cn("h-4", (r + c) % 3 ? "w-3/4" : "w-1/2")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Label / value pairs (a <dl> in a card). */
export function DetailsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid gap-x-4 gap-y-3 sm:grid-cols-[10rem_1fr]">
      {range(rows).map((i) => (
        <div key={i} className="contents">
          <Skeleton className="h-4 w-24" />
          <Skeleton className={cn("h-4", i % 2 ? "w-1/2" : "w-2/3")} />
        </div>
      ))}
    </div>
  );
}

/** Main column plus a sidebar, as on admin detail pages. */
export function SplitSkeleton({
  main,
  aside,
  className,
}: {
  main: ReactNode;
  aside: ReactNode;
  /** grid template, e.g. "xl:grid-cols-[minmax(0,1fr)_20rem]" */
  className: string;
}) {
  return (
    <div className={cn("grid items-start gap-6", className)}>
      <div className="min-w-0 space-y-6">{main}</div>
      <div className="space-y-6">{aside}</div>
    </div>
  );
}

/**
 * The whole app chrome, for loads that happen before any shell is on screen:
 * first visit, switching between member and admin mode, public pages.
 */
export function ShellSkeleton() {
  return (
    <PageSkeleton className="flex flex-1 flex-col">
      <div className="border-b border-slate-200 bg-white pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2">
          <div className="flex min-h-11 items-center gap-2">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="hidden h-5 w-24 sm:block" />
          </div>
          <Skeleton className="size-8 rounded-full" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <HeaderSkeleton description />
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton lines={2} />
        </div>
      </div>
    </PageSkeleton>
  );
}
