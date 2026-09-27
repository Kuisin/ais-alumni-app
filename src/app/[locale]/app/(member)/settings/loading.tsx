import {
  CardSkeleton,
  FormSkeleton,
  HeaderSkeleton,
  PageSkeleton,
  PillsSkeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageSkeleton className="mx-auto max-w-2xl">
      <HeaderSkeleton description />
      <PillsSkeleton count={5} className="mb-6" />
      <div className="space-y-6">
        <CardSkeleton>
          <FormSkeleton fields={2} />
        </CardSkeleton>
        <CardSkeleton>
          <FormSkeleton fields={1} />
        </CardSkeleton>
        <CardSkeleton lines={2} />
      </div>
    </PageSkeleton>
  );
}
