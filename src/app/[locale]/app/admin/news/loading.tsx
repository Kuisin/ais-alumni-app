import {
  HeaderSkeleton,
  PageSkeleton,
  RowsSkeleton,
  TabsSkeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton description actions={1} />
      <TabsSkeleton />
      <RowsSkeleton rows={6} />
    </PageSkeleton>
  );
}
