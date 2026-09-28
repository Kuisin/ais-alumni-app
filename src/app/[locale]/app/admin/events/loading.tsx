import {
  HeaderSkeleton,
  PageSkeleton,
  RowsSkeleton,
  Skeleton,
} from "@/components/ui/skeleton";

/** Upcoming and past sections. */
export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton description actions={1} />
      <div className="space-y-8">
        <div>
          <Skeleton className="mb-3 h-6 w-32" />
          <RowsSkeleton rows={3} />
        </div>
        <div>
          <Skeleton className="mb-3 h-6 w-32" />
          <RowsSkeleton rows={4} />
        </div>
      </div>
    </PageSkeleton>
  );
}
