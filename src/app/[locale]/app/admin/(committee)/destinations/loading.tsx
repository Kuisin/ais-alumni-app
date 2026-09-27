import {
  BarsSkeleton,
  FilterSkeleton,
  HeaderSkeleton,
  PageSkeleton,
  StatsSkeleton,
  TableSkeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton description />
      <FilterSkeleton fields={2} />
      <div className="space-y-6">
        <StatsSkeleton count={2} />
        <div className="grid gap-6 lg:grid-cols-2">
          <BarsSkeleton />
          <BarsSkeleton />
        </div>
        <TableSkeleton rows={6} cols={4} />
      </div>
    </PageSkeleton>
  );
}
