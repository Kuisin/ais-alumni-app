import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { BroadcastForm } from "@/components/broadcast/broadcast-form";
import { Card, PageHeader } from "@/components/ui/card";
import { getBroadcastRights } from "@/lib/broadcasts";
import { loadCohortOptions } from "@/lib/cohorts-db";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { requireActive } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("broadcast");
  return { title: t("pageTitle") };
}

/** Send a notification: admins, teacher managers, student leaders (own class). */
export default async function NotifyPage() {
  const me = await requireActive();
  const rights = await getBroadcastRights(me);
  if (rights.length === 0) notFound();
  const canAny = rights.some((r) => r.kind === "ANY");
  const locale = (await getLocale()) === "en" ? "en" : "ja";
  const leaderCohortIds = new Set(
    rights.flatMap((r) => (r.kind === "COHORT" ? [r.cohortId] : [])),
  );
  const allCohorts = await loadCohortOptions(locale);
  const cohorts = canAny
    ? allCohorts
    : allCohorts.filter((c) => leaderCohortIds.has(c.id));
  const cohortName = new Map(allCohorts.map((c) => [c.id, c.label]));
  const [t, tr] = await Promise.all([
    getTranslations("broadcast"),
    getTranslations("roles"),
  ]);
  const history = await db.broadcast.findMany({
    where: { senderId: me.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={canAny ? t("descriptionAny") : t("descriptionLeader")}
      />
      <Card>
        <BroadcastForm canAny={canAny} cohorts={cohorts} />
      </Card>
      {history.length ? (
        <Card>
          <h2 className="mb-3 text-lg font-semibold">{t("history")}</h2>
          <ul className="divide-y divide-slate-100">
            {history.map((b) => (
              <li key={b.id} className="py-3 text-sm">
                <p className="font-medium">{b.title}</p>
                <p className="text-slate-600">
                  {formatDateTime(b.createdAt, locale)} ·{" "}
                  {b.scope === "COHORT"
                    ? ((b.cohortId ? cohortName.get(b.cohortId) : null) ?? "—")
                    : b.targetRoles.length
                      ? b.targetRoles.map((r) => tr(`role.${r}`)).join(", ")
                      : t("audience.ALL")}{" "}
                  ·{" "}
                  {t("historyCounts", {
                    recipients: b.recipientCount,
                    line: b.lineCount,
                    email: b.emailCount,
                  })}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
