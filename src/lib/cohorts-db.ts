import { cache } from "react";
import { type CohortLike, cohortOptions, cohortShort } from "@/lib/cohorts";
import { db } from "@/lib/db";

/** All 学年 (a small table: one row per class); cached per request. */
export const listCohorts = cache(async (): Promise<CohortLike[]> => {
  return db.cohort.findMany({
    orderBy: { number: "asc" },
    select: {
      id: true,
      number: true,
      elementaryStartYear: true,
      elementaryEndYear: true,
      graduated: true,
    },
  });
});

export async function loadCohortOptions(locale: "ja" | "en") {
  return cohortOptions(await listCohorts(), locale);
}

/** id → "第N期" for display next to role details. */
export async function cohortShortLabels(
  locale: "ja" | "en",
): Promise<Record<string, string>> {
  const all = await listCohorts();
  return Object.fromEntries(all.map((c) => [c.id, cohortShort(c, locale)]));
}
