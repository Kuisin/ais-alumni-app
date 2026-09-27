import {
  CardSkeleton,
  DetailsSkeleton,
  HeaderSkeleton,
  PageSkeleton,
  RowsSkeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton />
      <div className="space-y-6">
        <CardSkeleton>
          <RowsSkeleton rows={3} framed={false} />
        </CardSkeleton>
        <CardSkeleton>
          <DetailsSkeleton rows={3} />
        </CardSkeleton>
        <CardSkeleton lines={2} />
      </div>
    </PageSkeleton>
  );
}
