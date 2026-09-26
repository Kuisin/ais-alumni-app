import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Badge, EmptyState, PageHeader } from "@/components/ui/card";
import { VerificationStatus } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import { isMinor } from "@/lib/authz/core";
import { db } from "@/lib/db";
import { displayName, formatDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { ROSTER_MATCH_THRESHOLD } from "@/lib/verification/roster";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminVerify" });
  return { title: t("queue.title") };
}

const QUEUE_LIMIT = 200;

/** §14 screen 15 — verification queue, oldest first. */
export default async function VerificationQueuePage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  const lang = locale === "en" ? "en" : "ja";
  await requireAdmin();
  const { tab } = await searchParams;
  const status =
    tab === "needsInfo"
      ? VerificationStatus.NEEDS_INFO
      : VerificationStatus.PENDING;
  const t = await getTranslations("adminVerify");
  const tr = await getTranslations("roles");

  const [requests, counts] = await Promise.all([
    db.verificationRequest.findMany({
      where: { status },
      orderBy: { submittedAt: "asc" },
      take: QUEUE_LIMIT,
      select: {
        id: true,
        submittedAt: true,
        rosterScore: true,
        user: {
          select: {
            nameRomaji: true,
            nameKanji: true,
            dateOfBirth: true,
            roles: { select: { role: true, schoolEmailVerified: true } },
            childLinks: {
              where: { confirmedAt: { not: null } },
              select: { id: true },
              take: 1,
            },
          },
        },
        vouches: { select: { answer: true } },
        _count: { select: { evidence: true } },
      },
    }),
    db.verificationRequest.groupBy({
      by: ["status"],
      where: {
        status: {
          in: [VerificationStatus.PENDING, VerificationStatus.NEEDS_INFO],
        },
      },
      _count: { _all: true },
    }),
  ]);
  const countOf = (s: VerificationStatus) =>
    counts.find((c) => c.status === s)?._count._all ?? 0;

  const tabs = [
    {
      key: "pending",
      href: "/app/admin/verification",
      status: VerificationStatus.PENDING,
    },
    {
      key: "needsInfo",
      href: "/app/admin/verification?tab=needsInfo",
      status: VerificationStatus.NEEDS_INFO,
    },
  ] as const;

  return (
    <>
      <PageHeader
        title={t("queue.title")}
        description={t("queue.description")}
      />
      <nav
        aria-label={t("queue.tabsLabel")}
        className="mb-4 flex gap-2 border-b border-slate-200"
      >
        {tabs.map((tb) => (
          <Link
            key={tb.key}
            href={tb.href}
            aria-current={status === tb.status ? "page" : undefined}
            className={`-mb-px min-h-11 border-b-2 px-3 py-2 text-sm font-medium ${
              status === tb.status
                ? "border-brand-700 text-brand-800"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {t(`queue.tabs.${tb.key}`)} ({countOf(tb.status)})
          </Link>
        ))}
      </nav>

      {requests.length === 0 ? (
        <EmptyState>{t("queue.empty")}</EmptyState>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => {
            const roles = r.user.roles.map((x) => x.role);
            const minor = isMinor({ roles, dateOfBirth: r.user.dateOfBirth });
            const tally = { YES: 0, NO: 0, NOT_SURE: 0, pending: 0 };
            for (const v of r.vouches) tally[v.answer ?? "pending"]++;
            return (
              <li key={r.id}>
                <Link
                  href={`/app/admin/verification/${r.id}`}
                  className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-brand-700 focus-visible:border-brand-700"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold">{displayName(r.user, lang)}</p>
                    <p className="text-xs text-slate-600">
                      {t("queue.submitted", {
                        date: formatDateTime(r.submittedAt, lang),
                      })}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">
                    {roles.map((role) => tr(`role.${role}`)).join(" · ")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge
                      tone={
                        r.rosterScore === null
                          ? "slate"
                          : r.rosterScore >= ROSTER_MATCH_THRESHOLD
                            ? "green"
                            : "amber"
                      }
                    >
                      {r.rosterScore === null
                        ? t("badges.noRoster")
                        : t("badges.roster", { score: r.rosterScore })}
                    </Badge>
                    <Badge
                      tone={
                        tally.YES > 0 ? "green" : tally.NO > 0 ? "red" : "slate"
                      }
                    >
                      {t("badges.vouches", {
                        yes: tally.YES,
                        no: tally.NO,
                        unsure: tally.NOT_SURE,
                        pending: tally.pending,
                      })}
                    </Badge>
                    <Badge>
                      {t("badges.evidence", { count: r._count.evidence })}
                    </Badge>
                    {r.user.roles.some((x) => x.schoolEmailVerified) ? (
                      <Badge tone="green">{t("badges.schoolEmail")}</Badge>
                    ) : null}
                    {minor ? (
                      <Badge tone="amber">{t("badges.minor")}</Badge>
                    ) : null}
                    {minor ? (
                      r.user.childLinks.length ? (
                        <Badge tone="green">
                          {t("badges.parentConfirmed")}
                        </Badge>
                      ) : (
                        <Badge tone="red">
                          {t("badges.parentUnconfirmed")}
                        </Badge>
                      )
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
