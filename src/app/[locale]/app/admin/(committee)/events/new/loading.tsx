import {
  CardSkeleton,
  FormSkeleton,
  HeaderSkeleton,
  PageSkeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton back />
      <CardSkeleton>
        <FormSkeleton fields={6} />
      </CardSkeleton>
    </PageSkeleton>
  );
}
