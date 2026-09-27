"use client";

import { Loader2 } from "lucide-react";
import { useLinkStatus } from "next/link";
import type { ReactNode } from "react";
import { cn } from "./cn";

// Feedback on a clicked link while its route is still on the way (it wasn't
// prefetched yet, e.g. on a slow phone connection). Render inside a <Link>.
// Both hints are always in the DOM (no layout shift) and appear only after a
// short delay, so fast navigations stay quiet.

/** A thin bar along the bottom of the link. The link must be `relative`. */
export function LinkPendingBar({
  className = "inset-x-3 bottom-0.5 rounded-full bg-current",
}: {
  /** position and colour of the bar */
  className?: string;
}) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute h-0.5 opacity-0",
        pending && "animate-pending",
        className,
      )}
    />
  );
}

/** Swaps the link's icon (arrow, chevron) for a spinner. */
export function LinkPendingIcon({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();
  return (
    <span className="relative inline-flex shrink-0">
      <span className={cn("inline-flex", pending && "animate-pending-out")}>
        {children}
      </span>
      {pending ? (
        <span aria-hidden="true" className="absolute inset-0 animate-pending">
          <Loader2 className="size-full animate-spin text-brand-700" />
        </span>
      ) : null}
    </span>
  );
}
