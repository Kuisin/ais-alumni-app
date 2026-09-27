import {
  BackLinkSkeleton,
  CardSkeleton,
  PageSkeleton,
  RowsSkeleton,
  Skeleton,
} from "@/components/ui/skeleton";

/** Stats, the camera box and the attendee list of CheckInBoard. */
export default function Loading() {
  return (
    <PageSkeleton>
      <BackLinkSkeleton />
      <Skeleton className="mb-6 h-8 w-56" />
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
            >
              <Skeleton className="mx-auto h-8 w-12" />
              <Skeleton className="mx-auto mt-2 h-3.5 w-16" />
            </div>
          ))}
        </div>
        <CardSkeleton>
          <div
            aria-hidden="true"
            className="mx-auto aspect-square w-full max-w-sm rounded-xl bg-slate-800"
          />
          <Skeleton className="mt-4 h-11 w-full rounded-lg" />
        </CardSkeleton>
        <CardSkeleton>
          <RowsSkeleton rows={4} framed={false} />
        </CardSkeleton>
      </div>
    </PageSkeleton>
  );
}
