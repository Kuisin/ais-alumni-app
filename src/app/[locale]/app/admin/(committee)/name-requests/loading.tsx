import {
  CardSkeleton,
  DetailsSkeleton,
  HeaderSkeleton,
  PageSkeleton,
  Skeleton,
  TabsSkeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton description />
      <TabsSkeleton />
      <div className="space-y-4">
        {[0, 1].map((i) => (
          <CardSkeleton key={i}>
            <DetailsSkeleton rows={3} />
            <div className="mt-4 flex gap-2">
              <Skeleton className="h-11 w-24 rounded-lg" />
              <Skeleton className="h-11 w-24 rounded-lg" />
            </div>
          </CardSkeleton>
        ))}
      </div>
    </PageSkeleton>
  );
}
