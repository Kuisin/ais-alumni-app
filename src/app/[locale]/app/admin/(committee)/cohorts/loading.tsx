import {
  CardSkeleton,
  HeaderSkeleton,
  PageSkeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton description />
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <CardSkeleton key={i} lines={2} />
        ))}
      </div>
    </PageSkeleton>
  );
}
