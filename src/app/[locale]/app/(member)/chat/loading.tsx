import { PageSkeleton, Skeleton } from "@/components/ui/skeleton";

/** Mirrors ChatList: sticky search header and full-bleed rows. */
export default function Loading() {
  return (
    <PageSkeleton className="-mx-4 -mt-6 lg:mx-0 lg:mt-0">
      <div className="space-y-3 border-b border-slate-200 bg-white px-4 pt-4 pb-3 lg:rounded-t-2xl">
        <div className="flex min-h-11 items-center justify-between gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <Skeleton className="h-10 w-full rounded-full" />
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-9 w-20 rounded-full" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-slate-100 bg-white lg:rounded-b-2xl lg:border lg:border-t-0 lg:border-slate-200">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-[52px] shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className={i % 2 ? "h-4 w-1/3" : "h-4 w-2/5"} />
                <Skeleton className="h-3 w-10" />
              </div>
              <Skeleton
                className={i % 3 ? "mt-2 h-3.5 w-3/5" : "mt-2 h-3.5 w-1/2"}
              />
            </div>
          </div>
        ))}
      </div>
    </PageSkeleton>
  );
}
