import {
  CardSkeleton,
  FormSkeleton,
  HeaderSkeleton,
  LinesSkeleton,
  PageSkeleton,
} from "@/components/ui/skeleton";

/** Fallback for onboarding steps (email, LINE): a header and one card. */
export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton description />
      <CardSkeleton title={false}>
        <LinesSkeleton lines={2} className="mb-6" />
        <FormSkeleton fields={1} />
      </CardSkeleton>
    </PageSkeleton>
  );
}
