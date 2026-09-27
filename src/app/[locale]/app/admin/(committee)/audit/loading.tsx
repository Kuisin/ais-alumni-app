import {
  FilterSkeleton,
  HeaderSkeleton,
  PageSkeleton,
  RowsSkeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton description />
      <FilterSkeleton />
      <RowsSkeleton rows={10} />
    </PageSkeleton>
  );
}
