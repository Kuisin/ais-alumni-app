import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/card";
import { RoleKey } from "@/generated/prisma/enums";
import { gradeLabel } from "@/lib/cohorts";
import { cohortShortLabels } from "@/lib/cohorts-db";
import type { PublicCard } from "@/lib/directory";

type RoleRow = PublicCard["roles"][number];

// Stable display order for a member with several roles.
const ORDER: RoleKey[] = [
  RoleKey.FORMER_STUDENT,
  RoleKey.CURRENT_STUDENT,
  RoleKey.TEACHER,
  RoleKey.CURRENT_PARENT,
  RoleKey.FORMER_PARENT,
];

export function sortRoles<T extends { role: RoleKey }>(
  roles: readonly T[],
): T[] {
  return [...roles].sort(
    (a, b) => ORDER.indexOf(a.role) - ORDER.indexOf(b.role),
  );
}

/** Public-tier facts for one role: years, grade, division, current stage. */
async function roleFacts(r: RoleRow, withStage: boolean): Promise<string[]> {
  const tr = await getTranslations("roles");
  const t = await getTranslations("profile");
  const facts: string[] = [];
  // 学年 first for students ("第5期").
  if (
    r.cohortId &&
    (r.role === RoleKey.CURRENT_STUDENT || r.role === RoleKey.FORMER_STUDENT)
  ) {
    const labels = await cohortShortLabels(
      (await getLocale()) === "en" ? "en" : "ja",
    );
    if (labels[r.cohortId]) facts.push(labels[r.cohortId]);
  }
  switch (r.role) {
    case RoleKey.TEACHER:
      facts.push(
        tr(
          `teacherStatusShort.${r.teacherStatus === "FORMER" ? "FORMER" : "CURRENT"}`,
        ),
      );
      if (r.yearsFrom !== null) {
        facts.push(
          r.yearsTo !== null
            ? t("record.teacherYears", { from: r.yearsFrom, to: r.yearsTo })
            : t("record.teacherYearsPresent", { from: r.yearsFrom }),
        );
      }
      break;
    case RoleKey.CURRENT_STUDENT:
      if (r.currentGrade !== null)
        facts.push(
          gradeLabel(
            r.currentGrade,
            (await getLocale()) === "en" ? "en" : "ja",
          ),
        );
      break;
    case RoleKey.FORMER_STUDENT:
      if (r.graduationOrLeaveYear !== null) {
        facts.push(
          r.didGraduate === false
            ? t("record.left", { year: r.graduationOrLeaveYear })
            : t("record.graduated", { year: r.graduationOrLeaveYear }),
        );
      }
      if (r.lastDivision) facts.push(tr(`division.${r.lastDivision}`));
      if (withStage && r.currentStage)
        facts.push(
          t("record.nowStage", { stage: tr(`stage.${r.currentStage}`) }),
        );
      break;
    default:
      break;
  }
  return facts;
}

/** Compact role badges + facts for member cards. */
export async function RoleSummary({ roles }: { roles: readonly RoleRow[] }) {
  const tr = await getTranslations("roles");
  const rows = await Promise.all(
    sortRoles(roles).map(async (r) => ({ r, facts: await roleFacts(r, true) })),
  );
  return (
    <ul className="mt-1 space-y-1">
      {rows.map(({ r, facts }) => (
        <li
          key={r.role}
          className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600"
        >
          <Badge tone="brand">{tr(`role.${r.role}`)}</Badge>
          {facts.length ? <span>{facts.join(" · ")}</span> : null}
        </li>
      ))}
    </ul>
  );
}

/** Full AIS record (profile page). Current stage is shown separately (§7). */
export async function AisRecord({
  roles,
}: {
  roles: readonly (RoleRow & { subjects?: string | null })[];
}) {
  const tr = await getTranslations("roles");
  const t = await getTranslations("profile");
  const rows = await Promise.all(
    sortRoles(roles).map(async (r) => ({
      r,
      facts: await roleFacts(r, false),
    })),
  );
  return (
    <dl className="space-y-3">
      {rows.map(({ r, facts }) => (
        <div key={r.role}>
          <dt className="font-medium text-slate-900">{tr(`role.${r.role}`)}</dt>
          <dd className="text-sm text-slate-700">
            {facts.length ? facts.join(" · ") : t("record.noDetails")}
            {r.role === RoleKey.TEACHER && r.subjects ? (
              <span className="block">
                {t("record.subjects", { subjects: r.subjects })}
              </span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
