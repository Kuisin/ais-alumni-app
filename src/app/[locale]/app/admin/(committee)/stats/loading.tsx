import {
  BarsSkeleton,
  HeaderSkeleton,
  PageSkeleton,
  StatsSkeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton description />
      <div className="space-y-6">
        <StatsSkeleton />
        <div className="grid gap-6 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <BarsSkeleton key={i} />
          ))}
        </div>
      </div>
    </PageSkeleton>
  );
}
