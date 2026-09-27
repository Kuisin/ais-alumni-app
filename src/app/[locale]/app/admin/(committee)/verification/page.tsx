import {
  ChevronRight,
  FileText,
  ListChecks,
  Search,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { formatAge, formatCompactDate } from "@/components/admin/admin-format";
import { PageNav, pageParam } from "@/components/admin/page-nav";
import { Signal } from "@/components/admin/signal";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Tabs } from "@/components/ui/tabs";
import { VerificationStatus } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import { isMinor } from "@/lib/authz/core";
import { cohortShort } from "@/lib/cohorts";
import { db } from "@/lib/db";
import { displayName, formatDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { ROSTER_MATCH_THRESHOLD } from "@/lib/verification/roster";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    tab?: string | string[];
    page?: string | string[];
    q?: string | string[];
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminVerify" });
  return { title: t("queue.title") };
}

const PAGE_SIZE = 20;

/** §14 screen 15 — verification queue, oldest first. */
export default async function VerificationQueuePage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  const lang = locale === "en" ? "en" : "ja";
  await requireAdmin();
  const sp = await searchParams;
  const status =
    sp.tab === "needsInfo"
      ? VerificationStatus.NEEDS_INFO
      : VerificationStatus.PENDING;
  const page = pageParam(sp.page);
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 60);
  const where = {
    status,
    ...(q
      ? {
          user: {
            OR: [
              { nameRomaji: { contains: q, mode: "insensitive" as const } },
              { nameKanji: { contains: q } },
            ],
          },
        }
      : {}),
  };
  const t = await getTranslations("adminVerify");
  const tr = await getTranslations("roles");

  const [requests, counts] = await Promise.all([
    db.verificationRequest.findMany({
      where,
      orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
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
            // Parents: the children whose details are being reviewed.
            parentLinks: {
              select: {
                childName: true,
                child: {
                  select: {
                    roles: {
                      where: { cohortId: { not: null } },
                      select: { cohort: { select: { number: true } } },
                      take: 1,
                    },
                  },
                },
              },
            },
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
  const total = q
    ? await db.verificationRequest.count({ where })
    : countOf(status);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const now = new Date();

  const tabQuery: Record<string, string> = {
    ...(status === VerificationStatus.NEEDS_INFO ? { tab: "needsInfo" } : {}),
    ...(q ? { q } : {}),
  };
  const pageHref = (n: number) => ({
    pathname: "/app/admin/verification",
    query: n > 1 ? { ...tabQuery, page: String(n) } : tabQuery,
  });

  return (
    <>
      <PageHeader
        title={t("queue.title")}
        description={t("queue.description")}
      />
      <Tabs
        label={t("queue.tabsLabel")}
        className="mb-4"
        items={[
          {
            href: "/app/admin/verification",
            label: t("queue.tabs.pending"),
            count: countOf(VerificationStatus.PENDING),
            active: status === VerificationStatus.PENDING,
          },
          {
            href: "/app/admin/verification?tab=needsInfo",
            label: t("queue.tabs.needsInfo"),
            count: countOf(VerificationStatus.NEEDS_INFO),
            active: status === VerificationStatus.NEEDS_INFO,
          },
        ]}
      />

      <form className="mb-4 flex gap-2">
        {status === VerificationStatus.NEEDS_INFO ? (
          <input type="hidden" name="tab" value="needsInfo" />
        ) : null}
        <label htmlFor="verify-q" className="sr-only">
          {t("queue.search")}
        </label>
        <Input
          id="verify-q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder={t("queue.searchPlaceholder")}
          className="min-w-0 flex-1"
        />
        <Button
          type="submit"
          variant="secondary"
          className="shrink-0 whitespace-nowrap"
        >
          <Search aria-hidden="true" className="size-4" />
          {t("queue.search")}
        </Button>
      </form>

      {requests.length === 0 ? (
        <EmptyState
          icon={<ListChecks />}
          hint={
            status === VerificationStatus.PENDING
              ? t("queue.emptyHint")
              : t("queue.emptyNeedsInfoHint")
          }
        >
          {t("queue.empty")}
        </EmptyState>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {requests.map((r) => {
            const roles = r.user.roles.map((x) => x.role);
            const minor = isMinor({ roles, dateOfBirth: r.user.dateOfBirth });
            const tally = { YES: 0, NO: 0, NOT_SURE: 0, pending: 0 };
            for (const v of r.vouches) tally[v.answer ?? "pending"]++;
            const rosterMatch =
              r.rosterScore !== null && r.rosterScore >= ROSTER_MATCH_THRESHOLD;
            return (
              <li key={r.id}>
                <Link
                  href={`/app/admin/verification/${r.id}`}
                  className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <p className="font-semibold text-slate-900 group-hover:text-brand-800">
                        {displayName(r.user, lang)}
                        <span className="ml-2 text-sm font-normal text-slate-600">
                          {roles.map((role) => tr(`role.${role}`)).join(" · ")}
                        </span>
                        {r.user.parentLinks.length ? (
                          <span className="block text-sm font-normal text-slate-600">
                            {t("queue.children", {
                              names: r.user.parentLinks
                                .map((l) => {
                                  const n = l.child?.roles[0]?.cohort?.number;
                                  return `${l.childName ?? "—"}${n ? `（${cohortShort({ number: n }, lang)}）` : ""}`;
                                })
                                .join("、"),
                            })}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs whitespace-nowrap text-slate-500 tabular-nums">
                        <time
                          dateTime={r.submittedAt.toISOString()}
                          title={formatDateTime(r.submittedAt, lang)}
                        >
                          {formatCompactDate(r.submittedAt, lang)}
                        </time>
                        <span className="ml-1.5 font-medium text-slate-700">
                          {formatAge(r.submittedAt, lang, now)}
                        </span>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Signal
                        tone={
                          r.rosterScore === null
                            ? "dim"
                            : rosterMatch
                              ? "green"
                              : "amber"
                        }
                        icon={<ListChecks />}
                      >
                        {r.rosterScore === null
                          ? t("badges.noRoster")
                          : rosterMatch
                            ? t("badges.rosterMatch", { score: r.rosterScore })
                            : t("badges.roster", { score: r.rosterScore })}
                      </Signal>
                      <Signal
                        tone={
                          tally.NO > 0
                            ? "red"
                            : tally.YES > 0
                              ? "green"
                              : r.vouches.length
                                ? "amber"
                                : "dim"
                        }
                        icon={<UserCheck />}
                      >
                        {r.vouches.length
                          ? t("badges.vouchCounts", {
                              yes: tally.YES,
                              no: tally.NO,
                              unsure: tally.NOT_SURE,
                              pending: tally.pending,
                            })
                          : t("badges.noVouches")}
                      </Signal>
                      <Signal
                        tone={r._count.evidence > 0 ? "blue" : "dim"}
                        icon={<FileText />}
                      >
                        {t("badges.evidence", { count: r._count.evidence })}
                      </Signal>
                      {r.user.roles.some((x) => x.schoolEmailVerified) ? (
                        <Signal tone="green" icon={<ShieldCheck />}>
                          {t("badges.schoolEmail")}
                        </Signal>
                      ) : null}
                      {minor ? (
                        <Signal tone="amber">{t("badges.minor")}</Signal>
                      ) : null}
                      {minor ? (
                        r.user.childLinks.length ? (
                          <Signal tone="green">
                            {t("badges.parentConfirmed")}
                          </Signal>
                        ) : (
                          <Signal tone="red">
                            {t("badges.parentUnconfirmed")}
                          </Signal>
                        )
                      ) : null}
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

      <PageNav
        label={t("queue.pagination")}
        prev={page > 1 ? pageHref(page - 1) : null}
        next={page < pages ? pageHref(page + 1) : null}
        prevLabel={t("queue.prev")}
        nextLabel={t("queue.next")}
        status={t("queue.pageOf", { page, pages })}
      />
    </>
  );
}
