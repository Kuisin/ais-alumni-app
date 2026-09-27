"use client";

import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/components/ui/cn";
import { classYears } from "@/lib/class-names";
import { schoolYearStart } from "@/lib/school";

/**
 * For the chosen 第N期: the class name each school year (Jellyfish →
 * 6th grade), so members can check it's their 学年.
 */
export function ClassYearsTable({ cohortNumber }: { cohortNumber: number }) {
  const t = useTranslations("verify.classYears");
  const en = useLocale() === "en";
  const now = schoolYearStart();
  const rows = classYears(cohortNumber);
  return (
    <details
      open
      className="rounded-lg border border-slate-200 bg-slate-50 text-sm"
    >
      <summary className="flex min-h-11 cursor-pointer items-center px-3 font-medium text-brand-800">
        {t("title", { number: cohortNumber })}
      </summary>
      <div className="px-3 pb-3">
        <p className="mb-2 text-xs text-slate-600">{t("hint")}</p>
        <table className="w-full text-left">
          <caption className="sr-only">
            {t("title", { number: cohortNumber })}
          </caption>
          <thead className="text-xs text-slate-500">
            <tr>
              <th scope="col" className="py-1 pr-3 font-medium">
                {t("year")}
              </th>
              <th scope="col" className="py-1 font-medium">
                {t("class")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((r) => (
              <tr
                key={r.grade}
                className={cn(
                  r.schoolYear === now && "bg-brand-50 font-semibold",
                )}
              >
                <td className="py-1.5 pr-3 whitespace-nowrap tabular-nums">
                  {en
                    ? `${r.schoolYear}–${String(r.schoolYear + 1).slice(2)}`
                    : `${r.schoolYear}年度`}
                  {r.schoolYear === now ? (
                    <span className="ml-1 text-xs text-brand-700">
                      {t("now")}
                    </span>
                  ) : null}
                </td>
                <td className="py-1.5">{en ? r.en : r.ja}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
