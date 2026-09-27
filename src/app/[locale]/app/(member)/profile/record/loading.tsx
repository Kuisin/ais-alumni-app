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
      <HeaderSkeleton back />
      <div className="space-y-6">
        <CardSkeleton>
          <DetailsSkeleton />
        </CardSkeleton>
        <CardSkeleton>
          <RowsSkeleton rows={2} framed={false} />
        </CardSkeleton>
      </div>
    </PageSkeleton>
  );
}
