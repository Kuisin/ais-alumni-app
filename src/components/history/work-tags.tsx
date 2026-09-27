import { industryLabel } from "@/lib/industries";
import { jobTypeLabel } from "@/lib/job-types";

/** 業種 and 職種 of a job, one small line each. */
export function WorkTags({
  industry,
  jobType,
  locale,
}: {
  industry?: string | null;
  jobType?: string | null;
  locale: "ja" | "en";
}) {
  const lines = [
    industryLabel(industry, locale),
    jobTypeLabel(jobType, locale),
  ];
  if (!lines.some(Boolean)) return null;
  return (
    <>
      {lines.map((l, i) =>
        l ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed pair
          <p key={i} className="text-xs text-slate-500">
            {l}
          </p>
        ) : null,
      )}
    </>
  );
}
