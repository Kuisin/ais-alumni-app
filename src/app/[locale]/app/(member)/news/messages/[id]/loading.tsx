import {
  BackLinkSkeleton,
  CardSkeleton,
  DetailsSkeleton,
  PageSkeleton,
  Skeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageSkeleton className="space-y-6">
      <div>
        <BackLinkSkeleton />
        <Skeleton className="h-9 w-2/3" />
      </div>
      <DetailsSkeleton rows={3} />
      <CardSkeleton title={false} lines={5} />
    </PageSkeleton>
  );
}
