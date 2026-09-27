import {
  FilterSkeleton,
  HeaderSkeleton,
  MemberGridSkeleton,
  PageSkeleton,
  Skeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton description />
      <FilterSkeleton />
      <Skeleton className="mb-3 h-6 w-32" />
      <MemberGridSkeleton count={8} />
    </PageSkeleton>
  );
}
