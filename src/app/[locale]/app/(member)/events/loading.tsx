import {
  HeaderSkeleton,
  ItemListSkeleton,
  PageSkeleton,
  TabsSkeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton description />
      <TabsSkeleton count={2} />
      <ItemListSkeleton />
    </PageSkeleton>
  );
}
