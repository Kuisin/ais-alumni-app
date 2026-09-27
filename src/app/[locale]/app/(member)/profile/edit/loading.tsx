import { Card } from "@/components/ui/card";
import {
  CardSkeleton,
  FormSkeleton,
  HeaderSkeleton,
  PageSkeleton,
  Skeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton actions={1} />
      <div className="space-y-4">
        <Card className="flex items-center gap-4">
          <Skeleton className="size-20 shrink-0 rounded-full" />
          <Skeleton className="h-11 w-32 rounded-lg" />
        </Card>
        <CardSkeleton>
          <FormSkeleton fields={2} />
        </CardSkeleton>
        <CardSkeleton>
          <FormSkeleton fields={3} />
        </CardSkeleton>
        <CardSkeleton lines={2} />
      </div>
    </PageSkeleton>
  );
}
