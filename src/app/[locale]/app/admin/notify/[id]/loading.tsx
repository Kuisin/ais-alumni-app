import {
  CardSkeleton,
  HeaderSkeleton,
  PageSkeleton,
  RowsSkeleton,
  SplitSkeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton back />
      <SplitSkeleton
        className="lg:grid-cols-[minmax(0,1fr)_22rem]"
        main={<CardSkeleton title={false} lines={6} />}
        aside={
          <>
            <CardSkeleton>
              <RowsSkeleton rows={4} framed={false} />
            </CardSkeleton>
            <CardSkeleton lines={2} />
          </>
        }
      />
    </PageSkeleton>
  );
}
