import {
  HeaderSkeleton,
  ItemListSkeleton,
  PageSkeleton,
} from "@/components/ui/skeleton";

/** Fallback for member pages without their own skeleton. */
export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton description />
      <ItemListSkeleton />
    </PageSkeleton>
  );
}
