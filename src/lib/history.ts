import { z } from "zod";
import {
  EducationLevel,
  HistoryVisibility,
  LifeStage,
} from "@/generated/prisma/enums";
import { isIndustryCode } from "@/lib/industries";
import { calendarYear } from "@/lib/school";

/**
 * 学歴 / 職歴 (education and work history). Pure helpers: validation,
 * ordering, visibility and the "current stage" they imply.
 */

type Entry = { startYear: number | null; endYear: number | null };

const year = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1950 || n > 2100) {
      ctx.addIssue({ code: "custom", message: "invalidYear" });
      return z.NEVER;
    }
    return n;
  });
const text = (max: number) => z.string().trim().max(max, "tooLong");
const optional = (max: number) => text(max).transform((v) => v || null);

function ordered<T extends Entry>(v: T, ctx: z.RefinementCtx) {
  if (v.startYear !== null && v.endYear !== null && v.endYear < v.startYear) {
    ctx.addIssue({ code: "custom", path: ["endYear"], message: "yearsOrder" });
  }
}

export const educationSchema = z
  .object({
    level: z.enum(EducationLevel, { error: "required" }),
    school: text(120).min(1, "required"),
    field: optional(120),
    startYear: year,
    endYear: year,
    visibility: z.enum(HistoryVisibility),
  })
  .superRefine(ordered);

export const workSchema = z
  .object({
    company: text(120).min(1, "required"),
    title: optional(120),
    /** 業種 code (src/lib/industries.ts); empty = not given */
    industry: z
      .string()
      .trim()
      .max(40)
      .refine((v) => !v || isIndustryCode(v), "invalid")
      .transform((v) => v || null),
    startYear: year,
    endYear: year,
    visibility: z.enum(HistoryVisibility),
  })
  .superRefine(ordered);

/** Ongoing: no end year, or it ends this year or later. */
export function isOngoing(e: Entry, now: Date = new Date()): boolean {
  return e.endYear === null || e.endYear >= calendarYear(now);
}

/** Current first, then most recent. */
export function sortHistory<T extends Entry>(
  entries: readonly T[],
  now: Date = new Date(),
): T[] {
  return [...entries].sort((a, b) => {
    const oa = isOngoing(a, now) ? 1 : 0;
    const ob = isOngoing(b, now) ? 1 : 0;
    if (oa !== ob) return ob - oa;
    return (
      (b.endYear ?? 9999) - (a.endYear ?? 9999) ||
      (b.startYear ?? 0) - (a.startYear ?? 0)
    );
  });
}

/** Entries a viewer may see: MEMBERS always; FOLLOWERS only with private access. */
export function visibleHistory<T extends { visibility: HistoryVisibility }>(
  entries: readonly T[],
  canViewPrivate: boolean,
): T[] {
  return entries.filter(
    (e) => canViewPrivate || e.visibility === HistoryVisibility.MEMBERS,
  );
}

const LEVEL_STAGE: Partial<Record<EducationLevel, LifeStage>> = {
  JUNIOR_HIGH: LifeStage.JUNIOR_HIGH,
  HIGH_SCHOOL: LifeStage.HIGH_SCHOOL,
  UNIVERSITY: LifeStage.UNIVERSITY_COLLEGE,
  GRADUATE_SCHOOL: LifeStage.UNIVERSITY_COLLEGE,
  VOCATIONAL: LifeStage.UNIVERSITY_COLLEGE,
};

/**
 * Current stage implied by the history (school first — e.g. a university
 * student with a part-time job is a student), with the school / company
 * name as the detail. Null when nothing is ongoing.
 */
export function stageFromHistory(
  education: readonly (Entry & { level: EducationLevel; school: string })[],
  work: readonly (Entry & { company: string })[],
  now: Date = new Date(),
): { stage: LifeStage; detail: string } | null {
  const school = sortHistory(education, now).find(
    (e) => isOngoing(e, now) && LEVEL_STAGE[e.level],
  );
  if (school)
    return {
      stage: LEVEL_STAGE[school.level] as LifeStage,
      detail: school.school,
    };
  const job = sortHistory(work, now).find((e) => isOngoing(e, now));
  if (job) return { stage: LifeStage.WORKING, detail: job.company };
  return null;
}
