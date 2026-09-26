import { getTranslations } from "next-intl/server";
import type {
  EducationLevel,
  HistoryVisibility,
} from "@/generated/prisma/enums";
import { isOngoing, sortHistory } from "@/lib/history";

type Edu = {
  id: string;
  level: EducationLevel;
  school: { name: string };
  field: string | null;
  startYear: number | null;
  endYear: number | null;
  visibility: HistoryVisibility;
};
type Job = {
  id: string;
  company: { name: string };
  title: string | null;
  startYear: number | null;
  endYear: number | null;
  visibility: HistoryVisibility;
};

/** Read-only timeline for a profile (entries already filtered for the viewer). */
export async function HistoryList({
  education,
  work,
}: {
  education: Edu[];
  work: Job[];
}) {
  const t = await getTranslations("history");
  const years = (e: { startYear: number | null; endYear: number | null }) =>
    `${e.startYear ?? ""}–${isOngoing(e) && e.endYear === null ? t("present") : (e.endYear ?? "")}`;
  if (!education.length && !work.length) return null;
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {education.length ? (
        <section>
          <h3 className="mb-2 font-semibold">{t("education")}</h3>
          <ol className="space-y-3 border-l-2 border-brand-100 pl-4">
            {sortHistory(education).map((e) => (
              <li key={e.id} className="animate-rise">
                <p className="font-medium">{e.school.name}</p>
                <p className="text-sm text-slate-600">
                  {t(`levels.${e.level}`)}
                  {e.field ? ` · ${e.field}` : ""} · {years(e)}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {work.length ? (
        <section>
          <h3 className="mb-2 font-semibold">{t("work")}</h3>
          <ol className="space-y-3 border-l-2 border-brand-100 pl-4">
            {sortHistory(work).map((e) => (
              <li key={e.id} className="animate-rise">
                <p className="font-medium">{e.company.name}</p>
                <p className="text-sm text-slate-600">
                  {e.title ? `${e.title} · ` : ""}
                  {years(e)}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
