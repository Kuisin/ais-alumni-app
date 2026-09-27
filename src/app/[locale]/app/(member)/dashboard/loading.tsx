import {
  CardSkeleton,
  HeaderSkeleton,
  ItemListSkeleton,
  PageSkeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton />
      <div className="grid gap-6 md:grid-cols-2">
        <CardSkeleton className="h-full">
          <ItemListSkeleton count={3} />
        </CardSkeleton>
        <CardSkeleton className="h-full">
          <ItemListSkeleton count={3} />
        </CardSkeleton>
      </div>
    </PageSkeleton>
  );
}
