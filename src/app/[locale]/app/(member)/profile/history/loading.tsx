import {
  CardSkeleton,
  HeaderSkeleton,
  PageSkeleton,
  Skeleton,
} from "@/components/ui/skeleton";

/** Education and work cards, each a list of bordered entries. */
export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton back />
      <div className="space-y-6">
        {[0, 1].map((card) => (
          <CardSkeleton key={card}>
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="rounded-lg border border-slate-200 p-3">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="mt-2 h-3.5 w-1/3" />
                </div>
              ))}
            </div>
          </CardSkeleton>
        ))}
      </div>
    </PageSkeleton>
  );
}
