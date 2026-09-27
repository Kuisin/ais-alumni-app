import {
  HeaderSkeleton,
  PageSkeleton,
  RowsSkeleton,
  SearchSkeleton,
  TabsSkeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton description />
      <TabsSkeleton count={2} />
      <SearchSkeleton />
      <RowsSkeleton rows={8} />
    </PageSkeleton>
  );
}
