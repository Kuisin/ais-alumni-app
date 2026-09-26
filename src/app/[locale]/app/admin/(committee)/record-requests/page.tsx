import { ClipboardCheck, History } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { RecordDecisionForm } from "@/components/records/decision-form";
import { RecordDiff } from "@/components/records/record-value";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { ChangeRequestStatus } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import { loadCohortChoices } from "@/lib/cohorts-db";
import { db } from "@/lib/db";
import { displayName, formatDateTime } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("records.admin");
  return { title: t("title") };
}

/** Admin: 在籍情報 correction requests (layout enforces admin). */
export default async function RecordRequestsPage({
  searchParams,
}: PageProps<"/[locale]/app/admin/record-requests">) {
  const tab = (await searchParams).tab === "decided" ? "decided" : "pending";
  const locale = (await getLocale()) === "en" ? "en" : "ja";
  const [t, tr, trec] = await Promise.all([
    getTranslations("records.admin"),
    getTranslations("roles"),
    getTranslations("records"),
  ]);
  const cohortLabels = Object.fromEntries(
    (await loadCohortChoices(locale)).map((c) => [c.value, c.label]),
  );
  const pendingCount = await db.recordChangeRequest.count({
    where: { status: ChangeRequestStatus.PENDING },
  });
  const requests = await db.recordChangeRequest.findMany({
    where:
      tab === "pending"
        ? { status: ChangeRequestStatus.PENDING }
        : {
            status: {
              in: [ChangeRequestStatus.APPROVED, ChangeRequestStatus.REJECTED],
            },
          },
    orderBy: { createdAt: tab === "pending" ? "asc" : "desc" },
    take: 50,
    include: {
      user: { select: { id: true, nameRomaji: true, nameKanji: true } },
      reviewer: { select: { nameRomaji: true, nameKanji: true } },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <Tabs
        label={t("tabsLabel")}
        items={(["pending", "decided"] as const).map((k) => ({
          href: {
            pathname: "/app/admin/record-requests",
            query: k === "decided" ? { tab: k } : {},
          },
          label: t(`tabs.${k}`),
          count: k === "pending" ? pendingCount : undefined,
          active: tab === k,
        }))}
      />

      {requests.length === 0 ? (
        <EmptyState
          icon={tab === "pending" ? <ClipboardCheck /> : <History />}
          hint={t(tab === "pending" ? "emptyPendingHint" : "emptyDecidedHint")}
        >
          {t(tab === "pending" ? "emptyPending" : "empty")}
        </EmptyState>
      ) : null}

      {requests.map((q) => (
        <Card key={q.id} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <Link
                href={`/app/admin/members/${q.user.id}`}
                className="font-semibold text-brand-700 underline"
              >
                {displayName(q.user, locale)}
              </Link>
              <span className="ml-2 text-sm text-slate-600">
                {tr(`role.${q.role}`)}
              </span>
            </div>
            <span className="text-sm text-slate-500">
              {formatDateTime(q.createdAt, locale)}
            </span>
          </div>
          <RecordDiff
            cohortLabels={cohortLabels}
            role={q.role}
            current={q.current as Record<string, unknown>}
            proposed={q.proposed as Record<string, unknown>}
          />
          <p className="text-sm text-slate-700">
            <span className="font-medium">{trec("reason")}: </span>
            {q.reason}
          </p>
          {q.status === ChangeRequestStatus.PENDING ? (
            <RecordDecisionForm id={q.id} />
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
              <Badge
                tone={
                  q.status === ChangeRequestStatus.APPROVED ? "green" : "red"
                }
              >
                {trec(`status.${q.status}`)}
              </Badge>
              {q.reviewer ? (
                <span>{displayName(q.reviewer, locale)}</span>
              ) : null}
              {q.decidedAt ? (
                <span className="text-slate-500">
                  {formatDateTime(q.decidedAt, locale)}
                </span>
              ) : null}
              {q.reviewNote ? <span>— {q.reviewNote}</span> : null}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
