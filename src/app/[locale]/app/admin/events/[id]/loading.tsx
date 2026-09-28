import {
  CardSkeleton,
  FormSkeleton,
  HeaderSkeleton,
  PageSkeleton,
  SplitSkeleton,
  StatsSkeleton,
  TableSkeleton,
} from "@/components/ui/skeleton";

/** Event form and attendees, with the stats sidebar. */
export default function Loading() {
  return (
    <PageSkeleton>
      <HeaderSkeleton back description actions={1} />
      <SplitSkeleton
        className="xl:grid-cols-[minmax(0,1fr)_20rem]"
        main={
          <>
            <CardSkeleton>
              <FormSkeleton fields={6} />
            </CardSkeleton>
            <TableSkeleton rows={5} cols={4} />
          </>
        }
        aside={
          <>
            <StatsSkeleton count={2} />
            <CardSkeleton lines={2} />
          </>
        }
      />
    </PageSkeleton>
  );
}
