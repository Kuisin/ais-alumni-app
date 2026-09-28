import { getLocale, getTranslations } from "next-intl/server";
import type {
  EducationLevel,
  HistoryVisibility,
} from "@/generated/prisma/enums";
import { isOngoing, sortHistory } from "@/lib/history";
import { historyReach } from "@/lib/profile-visibility";
import { ReachTag } from "../profile/visibility";
import { WorkTags } from "./work-tags";

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
  industry?: string | null;
  jobType?: string | null;
  startYear: number | null;
  endYear: number | null;
  visibility: HistoryVisibility;
};

/**
 * Read-only timeline for a profile (entries already filtered for the
 * viewer). showReach: who sees each entry (the member's own profile).
 */
export async function HistoryList({
  education,
  work,
  showReach = false,
}: {
  education: Edu[];
  work: Job[];
  showReach?: boolean;
}) {
  const t = await getTranslations("history");
  const locale = (await getLocale()) === "en" ? "en" : "ja";
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
                {showReach ? (
                  <ReachTag reach={historyReach(e.visibility)} />
                ) : null}
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
                <WorkTags
                  industry={e.industry}
                  jobType={e.jobType}
                  locale={locale}
                />
                <p className="text-sm text-slate-600">
                  {e.title ? `${e.title} · ` : ""}
                  {years(e)}
                </p>
                {showReach ? (
                  <ReachTag reach={historyReach(e.visibility)} />
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
