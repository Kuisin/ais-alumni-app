import {
  CardSkeleton,
  FormSkeleton,
  HeaderSkeleton,
  MemberGridSkeleton,
  PageSkeleton,
  RowsSkeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton description />
      <div className="space-y-6">
        <CardSkeleton>
          <MemberGridSkeleton count={2} />
        </CardSkeleton>
        <CardSkeleton>
          <RowsSkeleton rows={3} framed={false} />
        </CardSkeleton>
        <CardSkeleton>
          <FormSkeleton fields={2} />
        </CardSkeleton>
      </div>
    </PageSkeleton>
  );
}
