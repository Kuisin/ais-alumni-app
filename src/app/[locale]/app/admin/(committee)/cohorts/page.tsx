import { Users } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { deleteCohortAction } from "@/app/actions/admin-cohorts";
import { CohortEditForm } from "@/components/cohorts/cohort-forms";
import { CohortReps } from "@/components/cohorts/cohort-reps";
import { Badge, EmptyState, PageHeader } from "@/components/ui/card";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { EditableCard } from "@/components/ui/view-edit";
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
  const tc = await getTranslations("common");
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
              {/* View first; 編集 opens the years / note, reps and delete. */}
              <EditableCard
                id={`cohort-${c.id}`}
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    <span>{t("numberValue", { number: c.number })}</span>
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
                  </span>
                }
                editLabel={t("edit")}
                closeLabel={tc("close")}
                view={
                  <div className="space-y-2 text-sm">
                    {/* Status and grade are computed from the end year. */}
                    <p className="text-slate-600">
                      {subtitle(cohortLabel(c, locale))} ·{" "}
                      {t("members", { count: c._count.roles })}
                    </p>
                    {c.note ? <p className="text-slate-700">{c.note}</p> : null}
                    <p>
                      <span className="font-medium">{t("reps.title")}: </span>
                      {c.positions.length ? (
                        c.positions
                          .map(
                            ({ user: u }) => u.nameRomaji ?? u.nameKanji ?? "—",
                          )
                          .join("、")
                      ) : (
                        <span className="text-slate-500">{t("reps.none")}</span>
                      )}
                    </p>
                  </div>
                }
              >
                <div className="space-y-4">
                  <CohortEditForm
                    id={c.id}
                    start={c.elementaryStartYear}
                    end={c.elementaryEndYear}
                    note={c.note ?? ""}
                  />
                  <CohortReps
                    cohortId={c.id}
                    reps={c.positions.map(({ user: u }) => ({
                      id: u.id,
                      name: u.nameRomaji ?? u.nameKanji ?? "—",
                      kanji: u.nameRomaji ? u.nameKanji : null,
                    }))}
                  />
                  {used === 0 ? (
                    <ConfirmForm
                      message={t("deleteConfirm")}
                      action={deleteCohortAction.bind(null, c.id)}
                      className="border-t border-slate-100 pt-3"
                    >
                      <SubmitButton variant="danger">
                        {t("delete")}
                      </SubmitButton>
                    </ConfirmForm>
                  ) : (
                    <p className="text-sm text-slate-600">
                      {t("cannotDelete")}
                    </p>
                  )}
                </div>
              </EditableCard>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
