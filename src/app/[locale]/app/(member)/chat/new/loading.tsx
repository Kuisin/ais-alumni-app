import {
  HeaderSkeleton,
  PageSkeleton,
  RowsSkeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton back description />
      <RowsSkeleton rows={6} avatar />
    </PageSkeleton>
  );
}
