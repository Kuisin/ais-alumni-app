/**
 * 学年 (classes). Numbered 第N期 by the year the class finishes 6th grade:
 * finishing in 2016 = 第5期, so 第1期 finished in 2012.
 */
export const FIRST_COHORT_ELEMENTARY_END = 2012;

export function cohortNumberFor(elementaryEndYear: number): number {
  return elementaryEndYear - FIRST_COHORT_ELEMENTARY_END + 1;
}

export function elementaryEndFor(number: number): number {
  return FIRST_COHORT_ELEMENTARY_END + number - 1;
}

/** Suggested elementary start year: six school years before the end year. */
export function suggestedStartYear(elementaryEndYear: number): number {
  return elementaryEndYear - 6;
}

/**
 * Assumption: the AIS school year starts in August (Japan time), so in
 * Aug–Dec the current school year ends next calendar year.
 */
export function schoolYearEnd(now: Date = new Date()): number {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.getUTCMonth() >= 7
    ? jst.getUTCFullYear() + 1
    : jst.getUTCFullYear();
}

/** Newest class currently at AIS: this year's 1st graders (finish G6 in 5 years). */
export function latestCohortNumber(now: Date = new Date()): number {
  return cohortNumberFor(schoolYearEnd(now) + 5);
}

/**
 * Default class status: graduated once its high-school graduation (6 years
 * after finishing 6th grade) is in a past school year. Admins can override.
 */
export function defaultGraduated(
  elementaryEndYear: number,
  now: Date = new Date(),
): boolean {
  return elementaryEndYear + 6 < schoolYearEnd(now);
}

export type CohortLike = {
  id: string;
  number: number;
  elementaryStartYear: number;
  elementaryEndYear: number;
  graduated: boolean;
};

/** "第5期（小学校 2010–2016）" / "Class 5 (elementary 2010–2016)" */
export function cohortLabel(c: CohortLike, locale: "ja" | "en"): string {
  const years = `${c.elementaryStartYear}–${c.elementaryEndYear}`;
  return locale === "ja"
    ? `第${c.number}期（小学校 ${years}）`
    : `Class ${c.number} (elementary ${years})`;
}

/** Short form for badges: "第5期" / "Class 5". */
export function cohortShort(
  c: Pick<CohortLike, "number">,
  locale: "ja" | "en",
): string {
  return locale === "ja" ? `第${c.number}期` : `Class ${c.number}`;
}

export type CohortOption = { id: string; label: string; graduated: boolean };

export function cohortOptions(
  cohorts: CohortLike[],
  locale: "ja" | "en",
): CohortOption[] {
  return [...cohorts]
    .sort((a, b) => a.number - b.number)
    .map((c) => ({
      id: c.id,
      label: cohortLabel(c, locale),
      graduated: c.graduated,
    }));
}
