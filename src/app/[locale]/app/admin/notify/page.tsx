import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ReadMeter, readPercent } from "@/components/admin/read-receipts";
import { broadcastAudienceText } from "@/components/broadcast/audience-text";
import { BroadcastForm } from "@/components/broadcast/broadcast-form";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";
import { receiptCounts } from "@/lib/announcements";
import { getBroadcastRights } from "@/lib/broadcasts";
import { loadCohortOptions } from "@/lib/cohorts-db";
import { db } from "@/lib/db";
import { displayName, formatDateTime } from "@/lib/format";
import { requireActive } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("broadcast");
  return { title: t("pageTitle") };
}

const HISTORY_SIZE = 30;

/** Send a notification: admins, teacher managers, student leaders (own class). */
export default async function NotifyPage({
  searchParams,
}: PageProps<"/[locale]/app/admin/notify">) {
  const me = await requireActive();
  // Admin mode admits other positions too; this page needs a send right.
  const rights = await getBroadcastRights(me);
  if (rights.length === 0) notFound();
  const canAny = rights.some((r) => r.kind === "ANY");
  const locale = (await getLocale()) === "en" ? "en" : "ja";
  // Admins may look at every sender's messages (?all=1).
  const showAll = me.isAdmin && (await searchParams).all === "1";
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
    where: showAll ? {} : { senderId: me.id },
    orderBy: { createdAt: "desc" },
    take: HISTORY_SIZE,
    include: {
      sender: { select: { nameRomaji: true, nameKanji: true } },
    },
  });
  const counts = await receiptCounts(history.map((b) => b.id));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={canAny ? t("descriptionAny") : t("descriptionLeader")}
      />
      <Card>
        <BroadcastForm canAny={canAny} cohorts={cohorts} />
      </Card>
      {history.length || me.isAdmin ? (
        <Card>
          <h2 className="mb-3 text-lg font-semibold">{t("history")}</h2>
          {me.isAdmin ? (
            <Tabs
              label={t("historyTabs")}
              className="mb-2"
              items={[
                {
                  href: "/app/admin/notify",
                  label: t("historyMine"),
                  active: !showAll,
                },
                {
                  href: { pathname: "/app/admin/notify", query: { all: "1" } },
                  label: t("historyAll"),
                  active: showAll,
                },
              ]}
            />
          ) : null}
          {history.length === 0 ? (
            <EmptyState compact>{t("historyEmpty")}</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {history.map((b) => {
                const c = counts.get(b.id);
                return (
                  <li key={b.id}>
                    <Link
                      href={`/app/admin/notify/${b.id}`}
                      className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-3 text-sm transition-colors hover:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-4">
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="font-medium break-words text-slate-900 group-hover:text-brand-800">
                            {b.title}
                            {b.archivedAt ? (
                              <span className="ml-2 align-middle">
                                <Badge tone="amber">
                                  {t("manage.archivedBadge")}
                                </Badge>
                              </span>
                            ) : null}
                            {b.editedAt ? (
                              <span className="ml-2 align-middle">
                                <Badge>{t("manage.editedBadge")}</Badge>
                              </span>
                            ) : null}
                          </p>
                          <p className="text-slate-600">
                            {formatDateTime(b.createdAt, locale)} ·{" "}
                            {broadcastAudienceText(b, {
                              cohort: (id) => cohortName.get(id),
                              audience: (a) => tr(`audience.${a}`),
                              all: t("audience.ALL"),
                            })}
                          </p>
                          {showAll ? (
                            <p className="text-slate-600">
                              {t("sentBy", {
                                name: displayName(b.sender, locale),
                              })}
                            </p>
                          ) : null}
                          <p className="text-xs text-slate-500">
                            {t("historyCounts", {
                              recipients: b.recipientCount,
                              line: b.lineCount,
                              email: b.emailCount,
                            })}
                          </p>
                        </div>
                        <div className="mt-2 max-w-60 shrink-0 sm:mt-0 sm:w-40">
                          {c ? (
                            <ReadMeter
                              read={c.read}
                              total={c.total}
                              label={t("receipts.readOf", c)}
                              percentLabel={t("receipts.percent", {
                                percent: readPercent(c.read, c.total),
                              })}
                            />
                          ) : (
                            <p className="text-xs text-slate-500">
                              <span aria-hidden="true">—</span>
                              <span className="sr-only">
                                {t("receipts.none")}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                      <ChevronRight
                        aria-hidden="true"
                        className="size-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-700"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ) : null}
    </div>
  );
}
