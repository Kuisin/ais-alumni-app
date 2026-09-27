import {
  CardSkeleton,
  FormSkeleton,
  HeaderSkeleton,
  PageSkeleton,
  RowsSkeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton description />
      <div className="space-y-6">
        <CardSkeleton>
          <RowsSkeleton rows={4} framed={false} />
        </CardSkeleton>
        <CardSkeleton>
          <FormSkeleton fields={1} />
        </CardSkeleton>
        <CardSkeleton lines={2} />
      </div>
    </PageSkeleton>
  );
}
