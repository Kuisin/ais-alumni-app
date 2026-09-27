import {
  CardSkeleton,
  FormSkeleton,
  HeaderSkeleton,
  PageSkeleton,
  PillsSkeleton,
  RowsSkeleton,
  SplitSkeleton,
} from "@/components/ui/skeleton";

/** Section chips, then the admin sections with a sidebar. */
export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton back description />
      <PillsSkeleton count={7} className="mb-6" />
      <SplitSkeleton
        className="xl:grid-cols-[minmax(0,1fr)_22rem]"
        main={
          <>
            <CardSkeleton>
              <FormSkeleton fields={6} />
            </CardSkeleton>
            <CardSkeleton>
              <FormSkeleton fields={3} />
            </CardSkeleton>
          </>
        }
        aside={
          <>
            <CardSkeleton>
              <RowsSkeleton rows={3} framed={false} />
            </CardSkeleton>
            <CardSkeleton />
          </>
        }
      />
    </PageSkeleton>
  );
}
