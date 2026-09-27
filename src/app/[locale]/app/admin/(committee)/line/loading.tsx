import {
  CardSkeleton,
  HeaderSkeleton,
  PageSkeleton,
  Skeleton,
} from "@/components/ui/skeleton";

/** Status card and the two rich-menu cards. */
export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton description />
      <div className="space-y-6">
        <CardSkeleton />
        <div className="grid gap-6 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <CardSkeleton key={i}>
              <Skeleton className="aspect-[2/1] w-full rounded-lg" />
              <Skeleton className="mt-4 h-11 w-32 rounded-lg" />
            </CardSkeleton>
          ))}
        </div>
      </div>
    </PageSkeleton>
  );
}
