import { Card } from "@/components/ui/card";
import {
  CardSkeleton,
  DetailsSkeleton,
  PageSkeleton,
  Skeleton,
} from "@/components/ui/skeleton";

/** Profile card (photo, name, badges, buttons) and the sections below. */
export default function Loading() {
  return (
    <PageSkeleton className="space-y-4">
      <Card>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <Skeleton className="size-24 shrink-0 rounded-full" />
          <div className="flex w-full min-w-0 flex-1 flex-col items-center sm:items-start">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-32" />
            <div className="mt-3 flex gap-1">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="mt-4 flex gap-2">
              <Skeleton className="h-11 w-28 rounded-lg" />
              <Skeleton className="h-11 w-28 rounded-lg" />
            </div>
          </div>
        </div>
      </Card>
      <CardSkeleton />
      <CardSkeleton>
        <DetailsSkeleton rows={3} />
      </CardSkeleton>
      <CardSkeleton lines={2} />
    </PageSkeleton>
  );
}
