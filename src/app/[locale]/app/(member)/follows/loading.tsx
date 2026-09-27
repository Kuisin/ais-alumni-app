import {
  HeaderSkeleton,
  MemberGridSkeleton,
  PageSkeleton,
  Skeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton description />
      <div className="mb-6 grid grid-cols-2 gap-2 sm:flex">
        <Skeleton className="h-11 rounded-full sm:w-36" />
        <Skeleton className="h-11 rounded-full sm:w-36" />
      </div>
      <MemberGridSkeleton />
    </PageSkeleton>
  );
}
