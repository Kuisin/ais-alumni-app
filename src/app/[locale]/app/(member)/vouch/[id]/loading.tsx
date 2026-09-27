import {
  CardSkeleton,
  FormSkeleton,
  HeaderSkeleton,
  LinesSkeleton,
  PageSkeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageSkeleton className="mx-auto max-w-xl">
      <HeaderSkeleton description />
      <CardSkeleton title={false}>
        <LinesSkeleton lines={2} className="mb-6" />
        <FormSkeleton fields={2} />
      </CardSkeleton>
    </PageSkeleton>
  );
}
