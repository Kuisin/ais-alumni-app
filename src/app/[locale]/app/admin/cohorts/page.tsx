import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { deleteCohortAction } from "@/app/actions/admin-cohorts";
import { CohortEditForm } from "@/components/cohorts/cohort-forms";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { cohortLabel } from "@/lib/cohorts";
import { db } from "@/lib/db";
import { isClassGraduated } from "@/lib/school";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cohorts");
  return { title: t("title") };
}

/** Admin: 学年 list (layout enforces admin). */
export default async function CohortsPage() {
  const t = await getTranslations("cohorts");
  const locale = (await getLocale()) === "en" ? "en" : "ja";
  const cohorts = await db.cohort.findMany({
    orderBy: { number: "desc" },
    include: {
      _count: { select: { roles: true, positions: true, broadcasts: true } },
    },
  });
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      {cohorts.length === 0 ? <EmptyState>{t("empty")}</EmptyState> : null}
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
                      {cohortLabel(c, locale)}
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
                    <span className="text-sm text-slate-600">
                      {t("members", { count: c._count.roles })}
                    </span>
                  </div>
                </div>
                {c.note ? (
                  <p className="text-sm text-slate-700">{c.note}</p>
                ) : null}
                <details>
                  <summary className="cursor-pointer text-sm font-medium text-brand-700">
                    {t("edit")}
                  </summary>
                  <div className="mt-3 space-y-3">
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
                  </div>
                </details>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
