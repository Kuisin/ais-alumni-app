import {
  CardSkeleton,
  HeaderSkeleton,
  PageSkeleton,
  TabsSkeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton description />
      <CardSkeleton />
      <TabsSkeleton count={2} />
      <div className="space-y-4">
        {[0, 1].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </PageSkeleton>
  );
}
