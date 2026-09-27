import {
  CardSkeleton,
  HeaderSkeleton,
  PageSkeleton,
  RowsSkeleton,
  SearchSkeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton description />
      <div className="space-y-6">
        <CardSkeleton>
          <SearchSkeleton />
          <RowsSkeleton rows={3} framed={false} />
        </CardSkeleton>
        <CardSkeleton>
          <RowsSkeleton rows={4} framed={false} />
        </CardSkeleton>
      </div>
    </PageSkeleton>
  );
}
