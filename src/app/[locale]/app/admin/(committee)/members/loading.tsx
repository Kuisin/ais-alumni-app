import {
  FilterSkeleton,
  HeaderSkeleton,
  MemberGridSkeleton,
  PageSkeleton,
  TableSkeleton,
} from "@/components/ui/skeleton";

/** Search, then cards on phones and a table from lg up. */
export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton description />
      <FilterSkeleton fields={2} />
      <MemberGridSkeleton count={8} className="lg:hidden" />
      <TableSkeleton rows={10} className="hidden lg:block" />
    </PageSkeleton>
  );
}
