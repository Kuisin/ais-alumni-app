import {
  HeaderSkeleton,
  PageSkeleton,
  RowsSkeleton,
} from "@/components/ui/skeleton";

/** Fallback for admin pages without their own skeleton. */
export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton description />
      <RowsSkeleton rows={6} />
    </PageSkeleton>
  );
}
