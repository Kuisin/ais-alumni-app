import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import {
  RosterDeleteForm,
  RosterImportForm,
} from "@/components/verify/roster-forms";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminVerify" });
  return { title: t("roster.title") };
}

/**
 * Roster (§6.4.1, §14). Optional (Open Q1): with no rows, verification simply
 * shows no roster score.
 */
export default async function RosterPage() {
  await requireAdmin();
  const t = await getTranslations("adminVerify");
  const tr = await getTranslations("roles");

  const [byKind, claimed] = await Promise.all([
    db.rosterEntry.groupBy({
      by: ["kind"],
      _count: { _all: true },
      orderBy: { kind: "asc" },
    }),
    db.rosterEntry.count({ where: { claimedByUserId: { not: null } } }),
  ]);
  const total = byKind.reduce((n, k) => n + k._count._all, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("roster.title")}
        description={t("roster.description")}
      />

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">{t("roster.current")}</h2>
        {total === 0 ? (
          <EmptyState>{t("roster.empty")}</EmptyState>
        ) : (
          <>
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{t("roster.current")}</caption>
              <thead>
                <tr className="border-b border-slate-200">
                  <th scope="col" className="py-2">
                    {t("roster.kind")}
                  </th>
                  <th scope="col" className="py-2 text-right">
                    {t("roster.count")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {byKind.map((k) => (
                  <tr key={k.kind} className="border-b border-slate-100">
                    <td className="py-2">{tr(`role.${k.kind}`)}</td>
                    <td className="py-2 text-right tabular-nums">
                      {k._count._all}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" className="py-2">
                    {t("roster.total")}
                  </th>
                  <td className="py-2 text-right font-semibold tabular-nums">
                    {total}
                  </td>
                </tr>
              </tfoot>
            </table>
            <p className="text-sm text-slate-600">
              {t("roster.claimedCount", { count: claimed })}
            </p>
          </>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">{t("roster.importTitle")}</h2>
        <RosterImportForm />
      </Card>

      {total > 0 ? (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold">{t("roster.deleteTitle")}</h2>
          <p className="text-sm text-slate-600">
            {t("roster.deleteDescription")}
          </p>
          <RosterDeleteForm />
        </Card>
      ) : null}
    </div>
  );
}
