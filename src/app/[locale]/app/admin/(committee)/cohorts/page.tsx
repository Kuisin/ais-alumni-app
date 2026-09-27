import { Users } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { deleteCohortAction } from "@/app/actions/admin-cohorts";
import { CohortEditForm } from "@/components/cohorts/cohort-forms";
import { CohortReps } from "@/components/cohorts/cohort-reps";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { ViewEdit } from "@/components/ui/view-edit";
import { PositionKey } from "@/generated/prisma/enums";
import { cohortLabel } from "@/lib/cohorts";
import { db } from "@/lib/db";
import { isClassGraduated } from "@/lib/school";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cohorts");
  return { title: t("title") };
}

/** "第9期（2020年 小学校卒業）" → "2020年 小学校卒業" (the title shows 第9期). */
function subtitle(label: string): string {
  return label.match(/[（(]([^（(]*)[）)]$/)?.[1] ?? label;
}

/** Admin: 学年 list (layout enforces admin). */
export default async function CohortsPage() {
  const t = await getTranslations("cohorts");
  const locale = (await getLocale()) === "en" ? "en" : "ja";
  const cohorts = await db.cohort.findMany({
    orderBy: { number: "desc" },
    include: {
      _count: { select: { roles: true, positions: true, broadcasts: true } },
      // 学年代表 of each 学年.
      positions: {
        where: { position: PositionKey.STUDENT_LEADER },
        orderBy: { createdAt: "asc" },
        select: {
          user: { select: { id: true, nameRomaji: true, nameKanji: true } },
        },
      },
    },
  });
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      {cohorts.length === 0 ? (
        <EmptyState icon={<Users />} hint={t("emptyHint")}>
          {t("empty")}
        </EmptyState>
      ) : null}
      <ul className="space-y-3">
        {cohorts.map((c) => {
          const used =
            c._count.roles + c._count.positions + c._count.broadcasts;
          return (
            <li key={c.id}>
              <Card className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold">
                      {t("numberValue", { number: c.number })}
                    </span>
                    {/* Status and grade are computed from the end year. */}
                    <span className="text-sm text-slate-600">
                      {subtitle(cohortLabel(c, locale))}
                    </span>
                    <Badge
                      tone={
                        isClassGraduated(c.elementaryEndYear)
                          ? "slate"
                          : "green"
                      }
                    >
                      {isClassGraduated(c.elementaryEndYear)
                        ? t("status.graduated")
                        : t("status.current")}
                    </Badge>
                    <span className="text-sm whitespace-nowrap text-slate-600">
                      {t("members", { count: c._count.roles })}
                    </span>
                  </div>
                </div>
                {c.note ? (
                  <p className="text-sm text-slate-700">{c.note}</p>
                ) : null}
                <CohortReps
                  cohortId={c.id}
                  reps={c.positions.map(({ user: u }) => ({
                    id: u.id,
                    name: u.nameRomaji ?? u.nameKanji ?? "—",
                    kanji: u.nameRomaji ? u.nameKanji : null,
                  }))}
                />
                <ViewEdit view={null} editLabel={t("edit")}>
                  <CohortEditForm
                    id={c.id}
                    start={c.elementaryStartYear}
                    end={c.elementaryEndYear}
                    note={c.note ?? ""}
                  />
                  {used === 0 ? (
                    <form action={deleteCohortAction.bind(null, c.id)}>
                      <SubmitButton variant="danger">
                        {t("delete")}
                      </SubmitButton>
                    </form>
                  ) : (
                    <p className="text-sm text-slate-600">
                      {t("cannotDelete")}
                    </p>
                  )}
                </ViewEdit>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
