import {
  CardSkeleton,
  FormSkeleton,
  HeaderSkeleton,
  PageSkeleton,
  RowsSkeleton,
  SplitSkeleton,
} from "@/components/ui/skeleton";

/** News form, with the responses / reads sidebar. */
export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton back description actions={2} />
      <SplitSkeleton
        className="xl:grid-cols-[minmax(0,1fr)_20rem]"
        main={
          <CardSkeleton>
            <FormSkeleton fields={6} />
          </CardSkeleton>
        }
        aside={
          <>
            <CardSkeleton>
              <RowsSkeleton rows={3} framed={false} />
            </CardSkeleton>
            <CardSkeleton>
              <RowsSkeleton rows={3} framed={false} />
            </CardSkeleton>
          </>
        }
      />
    </PageSkeleton>
  );
}
