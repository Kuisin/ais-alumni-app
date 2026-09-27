import {
  CardSkeleton,
  FormSkeleton,
  HeaderSkeleton,
  PageSkeleton,
  RowsSkeleton,
  TabsSkeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton description />
      <div className="space-y-6">
        <CardSkeleton>
          <FormSkeleton fields={4} />
        </CardSkeleton>
        <CardSkeleton>
          <TabsSkeleton />
          <RowsSkeleton rows={4} framed={false} />
        </CardSkeleton>
      </div>
    </PageSkeleton>
  );
}
