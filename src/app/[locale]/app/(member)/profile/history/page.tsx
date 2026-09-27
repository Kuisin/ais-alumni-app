import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { deleteHistoryAction } from "@/app/actions/history";
import { AddHistory } from "@/components/history/add-history";
import { HistoryForm } from "@/components/history/history-form";
import { BackLink } from "@/components/ui/back-link";
import { Badge, Card, PageHeader } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { ViewEdit } from "@/components/ui/view-edit";
import { db } from "@/lib/db";
import { isOngoing, sortHistory } from "@/lib/history";
import { requireActive } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("history");
  return { title: t("title") };
}

/** 学歴・職歴: add, edit and remove entries; ongoing ones set the current stage. */
export default async function HistoryPage() {
  const me = await requireActive();
  const t = await getTranslations("history");
  const [education, work] = await Promise.all([
    db.educationEntry.findMany({
      where: { userId: me.id },
      include: { school: true },
    }),
    db.workEntry.findMany({
      where: { userId: me.id },
      include: { company: true },
    }),
  ]);
  const years = (e: { startYear: number | null; endYear: number | null }) =>
    `${e.startYear ?? ""}–${e.endYear ?? t("present")}`;

  const section = (kind: "education" | "work") => {
    const rows =
      kind === "education" ? sortHistory(education) : sortHistory(work);
    return (
      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{t(kind)}</h2>
          <p className="text-sm text-slate-600">{t(`intro.${kind}`)}</p>
        </div>
        {rows.length ? (
          <ul className="space-y-3">
            {rows.map((e) => (
              <li
                key={e.id}
                className="animate-rise rounded-xl border border-slate-200 p-3"
              >
                <ViewEdit
                  editLabel={t("edit")}
                  view={
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {"school" in e ? e.school.name : e.company.name}
                        </span>
                        {isOngoing(e) && e.endYear === null ? (
                          <Badge tone="green">{t("current")}</Badge>
                        ) : null}
                        <Badge
                          tone={e.visibility === "MEMBERS" ? "brand" : "slate"}
                        >
                          {t(`visibility.${e.visibility}`)}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">
                        {"level" in e
                          ? `${t(`levels.${e.level}`)}${e.field ? ` · ${e.field}` : ""}`
                          : (e.title ?? "")}{" "}
                        · {years(e)}
                      </p>
                    </div>
                  }
                >
                  <HistoryForm kind={kind} values={e} />
                  <form action={deleteHistoryAction.bind(null, kind, e.id)}>
                    <SubmitButton variant="ghost">{t("delete")}</SubmitButton>
                  </form>
                </ViewEdit>
              </li>
            ))}
          </ul>
        ) : null}
        <AddHistory
          kind={kind}
          empty={rows.length ? undefined : t(`empty.${kind}`)}
        />
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/app/profile/edit">{t("backToProfile")}</BackLink>
        <PageHeader title={t("title")} description={t("description")} />
      </div>
      {section("education")}
      {section("work")}
    </div>
  );
}
