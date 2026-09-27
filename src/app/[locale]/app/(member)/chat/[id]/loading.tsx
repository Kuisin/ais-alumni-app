"use client";

import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/components/ui/cn";
import { PageSkeleton, Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";

const BUBBLES = [
  { mine: false, width: "w-48" },
  { mine: false, width: "w-64" },
  { mine: true, width: "w-40" },
  { mine: false, width: "w-56" },
  { mine: true, width: "w-60" },
  { mine: true, width: "w-32" },
];

/**
 * Mirrors ChatRoom: full screen on phones (so it keeps a working back link),
 * a fixed-height panel on desktop.
 */
export default function Loading() {
  const t = useTranslations("chat.room");
  return (
    <PageSkeleton className="fixed inset-0 z-50 flex flex-col bg-slate-100 lg:static lg:z-auto lg:h-[calc(100dvh-9rem)] lg:overflow-hidden lg:rounded-2xl lg:shadow-sm">
      <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-1 pt-[env(safe-area-inset-top)]">
        <Link
          href="/app/chat"
          aria-label={t("back")}
          className="inline-flex size-11 items-center justify-center rounded-full text-slate-900 hover:bg-slate-100"
        >
          <ChevronLeft aria-hidden="true" className="size-6" />
        </Link>
        <div className="flex-1 py-3.5">
          <Skeleton className="h-5 w-40" />
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-end gap-3 overflow-hidden px-3 py-4">
        {BUBBLES.map((b) =>
          b.mine ? (
            <div key={b.width} className="flex justify-end">
              <div
                aria-hidden="true"
                className={cn(
                  "h-10 max-w-[70%] animate-pulse rounded-2xl bg-brand-100",
                  b.width,
                )}
              />
            </div>
          ) : (
            <div key={b.width} className="flex items-end gap-2">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <Skeleton
                className={cn("h-10 max-w-[70%] rounded-2xl", b.width)}
              />
            </div>
          ),
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-slate-200 bg-white px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        <Skeleton className="h-10 flex-1 rounded-full" />
        <Skeleton className="size-10 shrink-0 rounded-full" />
      </div>
    </PageSkeleton>
  );
}
