import { Baby, CircleAlert, CircleCheck, Clock, UserPlus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/card";
import { RoleKey } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import { roleLabelKey } from "@/lib/audience";
import { cohortLabel, gradeLabel } from "@/lib/cohorts";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { matchStudentRoster } from "@/lib/verification/match";
import { ROSTER_MATCH_THRESHOLD } from "@/lib/verification/roster";

const STUDENT_ROLES: RoleKey[] = [
  RoleKey.CURRENT_STUDENT,
  RoleKey.FORMER_STUDENT,
];

/**
 * The children of a parent's application, which is what the committee
 * checks for parents: each child's details, where they came from (created by
 * this parent, or already registered) and whether the link is confirmed.
 */
export async function ChildrenReview({ parentId }: { parentId: string }) {
  const t = await getTranslations("adminVerify.children");
  const tr = await getTranslations("roles");
  const locale = (await getLocale()) === "en" ? "en" : "ja";
  const links = await db.familyLink.findMany({
    where: { parentId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      childName: true,
      confirmedAt: true,
      child: {
        select: {
          id: true,
          state: true,
          managedById: true,
          nameRomaji: true,
          nameKanji: true,
          dateOfBirth: true,
          roles: {
            where: { role: { in: STUDENT_ROLES } },
            select: {
              role: true,
              didGraduate: true,
              currentGrade: true,
              yearsFrom: true,
              yearsTo: true,
              graduationOrLeaveYear: true,
              studentIdNo: true,
              cohort: { select: { number: true, elementaryEndYear: true } },
            },
          },
        },
      },
    },
  });
  if (links.length === 0)
    return <p className="text-sm text-slate-600">{t("none")}</p>;

  const cards = await Promise.all(
    links.map(async (l) => {
      const c = l.child;
      const role = c?.roles[0];
      const createdHere = c?.managedById === parentId;
      const match =
        c && createdHere
          ? await matchStudentRoster({
              nameRomaji: c.nameRomaji ?? "",
              nameKanji: c.nameKanji,
              dateOfBirth: c.dateOfBirth,
              yearsFrom: role?.yearsFrom ?? null,
              yearsTo: role?.yearsTo ?? null,
            })
          : null;
      return { l, c, role, createdHere, match };
    }),
  );

  return (
    <ul className="space-y-3">
      {cards.map(({ l, c, role, createdHere, match }) => (
        <li key={l.id} className="rounded-lg border border-slate-200 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="flex items-center gap-2 font-semibold">
              <Baby aria-hidden="true" className="size-4 text-brand-700" />
              {c ? (
                <Link
                  href={`/app/admin/members/${c.id}`}
                  className="text-brand-700 hover:underline"
                >
                  {[c.nameKanji, c.nameRomaji].filter(Boolean).join(" / ") ||
                    l.childName}
                </Link>
              ) : (
                (l.childName ?? "—")
              )}
            </p>
            <span className="flex flex-wrap gap-1">
              {c === null ? (
                <Badge tone="amber">{t("source.nameOnly")}</Badge>
              ) : createdHere ? (
                <Badge tone="brand">
                  <UserPlus aria-hidden="true" className="mr-1 size-3" />
                  {t("source.created")}
                </Badge>
              ) : (
                <Badge>{t("source.registered")}</Badge>
              )}
              {l.confirmedAt ? (
                <Badge tone="green">
                  <CircleCheck aria-hidden="true" className="mr-1 size-3" />
                  {t("link.confirmed")}
                </Badge>
              ) : c && (createdHere || c.managedById) ? (
                <Badge tone="amber">
                  <Clock aria-hidden="true" className="mr-1 size-3" />
                  {t("link.onApproval")}
                </Badge>
              ) : c ? (
                <Badge tone="amber">
                  <Clock aria-hidden="true" className="mr-1 size-3" />
                  {t("link.childToConfirm")}
                </Badge>
              ) : null}
            </span>
          </div>
          {c ? (
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-slate-600">{t("dob")}</dt>
              <dd>{c.dateOfBirth ? formatDate(c.dateOfBirth, locale) : "—"}</dd>
              <dt className="text-slate-600">{t("cohort")}</dt>
              <dd>
                {role?.cohort
                  ? cohortLabel(
                      {
                        number: role.cohort.number,
                        elementaryEndYear: role.cohort.elementaryEndYear,
                      },
                      locale,
                    )
                  : "—"}
              </dd>
              <dt className="text-slate-600">{t("status")}</dt>
              <dd>
                {role ? tr(roleLabelKey(role)) : "—"}
                {role?.role === RoleKey.CURRENT_STUDENT &&
                role.currentGrade !== null
                  ? `（${gradeLabel(role.currentGrade, locale)}）`
                  : role?.graduationOrLeaveYear
                    ? `（${role.graduationOrLeaveYear}）`
                    : ""}
              </dd>
              <dt className="text-slate-600">{t("years")}</dt>
              <dd>
                {role?.yearsFrom ?? "?"}–{role?.yearsTo ?? ""}
              </dd>
              {role?.studentIdNo ? (
                <>
                  <dt className="text-slate-600">{t("studentId")}</dt>
                  <dd>{role.studentIdNo}</dd>
                </>
              ) : null}
              {createdHere ? (
                <>
                  <dt className="text-slate-600">{t("roster")}</dt>
                  <dd>
                    {match === null ? (
                      <span className="text-slate-500">{t("rosterNone")}</span>
                    ) : match.score >= ROSTER_MATCH_THRESHOLD ? (
                      <span className="inline-flex items-center gap-1 text-green-800">
                        <CircleCheck aria-hidden="true" className="size-4" />
                        {t("rosterMatch", { score: match.score })}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-800">
                        <CircleAlert aria-hidden="true" className="size-4" />
                        {t("rosterWeak", { score: match.score })}
                      </span>
                    )}
                  </dd>
                </>
              ) : null}
            </dl>
          ) : (
            <p className="mt-2 text-sm text-slate-600">{t("nameOnlyHint")}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
