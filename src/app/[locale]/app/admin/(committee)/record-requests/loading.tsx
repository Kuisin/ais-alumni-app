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
      <TabsSkeleton count={2} />
      <div className="space-y-4">
        {[0, 1].map((i) => (
          <CardSkeleton key={i}>
            <DetailsSkeleton rows={3} />
            <Skeleton className="mt-4 h-11 w-28 rounded-lg" />
          </CardSkeleton>
        ))}
      </div>
    </PageSkeleton>
  );
}
