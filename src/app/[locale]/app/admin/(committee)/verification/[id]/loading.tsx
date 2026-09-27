import {
  CardSkeleton,
  DetailsSkeleton,
  FormSkeleton,
  HeaderSkeleton,
  PageSkeleton,
  RowsSkeleton,
  SplitSkeleton,
} from "@/components/ui/skeleton";

/** Application sections, with the decision form in the sidebar. */
export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton back description actions={1} />
      <SplitSkeleton
        className="lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_24rem]"
        main={
          <>
            <CardSkeleton>
              <DetailsSkeleton rows={5} />
            </CardSkeleton>
            <CardSkeleton>
              <RowsSkeleton rows={2} framed={false} />
            </CardSkeleton>
            <CardSkeleton />
          </>
        }
        aside={
          <CardSkeleton>
            <FormSkeleton fields={2} />
          </CardSkeleton>
        }
      />
    </PageSkeleton>
  );
}
