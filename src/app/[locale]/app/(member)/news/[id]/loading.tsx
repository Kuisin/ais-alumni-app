import {
  BackLinkSkeleton,
  CardSkeleton,
  LinesSkeleton,
  PageSkeleton,
  Skeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageSkeleton className="space-y-6">
      <div>
        <BackLinkSkeleton />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-3 h-9 w-3/4" />
      </div>
      <LinesSkeleton lines={6} />
      <CardSkeleton lines={2} />
    </PageSkeleton>
  );
}
