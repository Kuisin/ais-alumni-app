import {
  BackLinkSkeleton,
  CardSkeleton,
  DetailsSkeleton,
  FormSkeleton,
  PageSkeleton,
  Skeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageSkeleton className="space-y-6">
      <div>
        <BackLinkSkeleton />
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="mt-3 h-4 w-40" />
      </div>
      <CardSkeleton title={false}>
        <DetailsSkeleton />
      </CardSkeleton>
      <CardSkeleton lines={5} />
      <CardSkeleton>
        <FormSkeleton fields={2} />
      </CardSkeleton>
    </PageSkeleton>
  );
}
