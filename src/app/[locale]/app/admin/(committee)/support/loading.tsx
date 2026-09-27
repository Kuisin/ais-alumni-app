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
      <TabsSkeleton count={2} />
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </PageSkeleton>
  );
}
