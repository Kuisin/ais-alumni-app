"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { elementaryEndFor, gradeLabel } from "@/lib/cohorts";
import { studentStatus } from "@/lib/school";

/** "You'll be registered as …" — the status the app works out. */
export function Preview({ children }: { children: ReactNode }) {
  return (
    <p
      className="animate-fade rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800"
      aria-live="polite"
    >
      <span aria-hidden="true">→ </span>
      {children}
    </p>
  );
}

export const num = (v: string): number | null =>
  /^\d{4}$/.test(v.trim()) ? Number(v) : null;

/** Status preview for a 学年 number + optional leave year. */
export function useStudentPreview() {
  const t = useTranslations("verify");
  const locale = useLocale() === "en" ? "en" : "ja";
  return (cohortNumber: string, leftYear: string): string | null => {
    const n = Number(cohortNumber);
    if (!Number.isInteger(n) || n < 1) return null;
    const st = studentStatus(elementaryEndFor(n), num(leftYear));
    if (st.current)
      return st.currentGrade !== null
        ? t("preview.current", { grade: gradeLabel(st.currentGrade, locale) })
        : t("preview.upcoming");
    return st.didGraduate
      ? t("preview.graduated", { year: st.graduationOrLeaveYear ?? "" })
      : t("preview.left", { year: st.graduationOrLeaveYear ?? "" });
  };
}
