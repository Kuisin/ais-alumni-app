import { Mail } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ActionItem, DashboardSection } from "@/components/dashboard/section";
import { EventCard } from "@/components/events/event-card";
import { LineBanner } from "@/components/line/line-banner";
import { NewsCard } from "@/components/news/news-card";
import { SetupChecklist } from "@/components/setup/setup-checklist";
import { EmptyState, PageHeader } from "@/components/ui/card";
import {
  FamilyLinkInitiator,
  FollowStatus,
  VerificationStatus,
} from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import { readNewsIds, unreadCounts } from "@/lib/announcements";
import { db } from "@/lib/db";
import { asLocale } from "@/lib/events";
import { displayName } from "@/lib/format";
import { awaitingResponse } from "@/lib/news-hub-db";
import { filterByAudience, visibleNews } from "@/lib/news-visibility";
import { requireActive } from "@/lib/session";
import { setupProgress } from "@/lib/setup";
import { loadSetupChecklist } from "@/lib/setup-db";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/dashboard">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard" });
  return { title: t("title") };
}

const NAME = { nameRomaji: true, nameKanji: true } as const;

export default async function DashboardPage({
  params,
}: PageProps<"/[locale]/app/dashboard">) {
  const locale = asLocale((await params).locale);
  const user = await requireActive();
  const t = await getTranslations("dashboard");
  const tn = await getTranslations("news");
  const now = new Date();

  const [events, news, followRequests, vouches, familyLinks, unread] =
    await Promise.all([
      db.event
        .findMany({
          where: {
            OR: [{ startsAt: { gte: now } }, { endsAt: { gte: now } }],
          },
          orderBy: { startsAt: "asc" },
          take: 200,
          select: {
            audience: true,
            targetAudiences: true,
            targetRoles: true,
            id: true,
            titleJa: true,
            titleEn: true,
            startsAt: true,
            location: true,
            rsvps: { where: { userId: user.id }, select: { answer: true } },
          },
        })
        // Same audience conditions as ニュース.
        .then(async (rows) => (await filterByAudience(user, rows)).slice(0, 3)),
      visibleNews(user, now).then((v) =>
        db.newsPost.findMany({
          where: { id: { in: v.slice(0, 3).map((p) => p.id) } },
          orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
          select: {
            id: true,
            titleJa: true,
            titleEn: true,
            bodyJa: true,
            bodyEn: true,
            pinned: true,
            publishedAt: true,
            requireConfirm: true,
            deadline: true,
          },
        }),
      ),
      db.follow.count({
        where: { followeeId: user.id, status: FollowStatus.REQUESTED },
      }),
      // Vouch requests still waiting for my answer on undecided applications.
      db.vouch.findMany({
        where: {
          voucherId: user.id,
          answer: null,
          request: {
            status: {
              in: [VerificationStatus.PENDING, VerificationStatus.NEEDS_INFO],
            },
          },
        },
        orderBy: { askedAt: "asc" },
        select: { id: true, request: { select: { user: { select: NAME } } } },
      }),
      // Family links initiated by the other side that I have to confirm.
      db.familyLink.findMany({
        where: {
          confirmedAt: null,
          OR: [
            { initiatedBy: FamilyLinkInitiator.PARENT, childId: user.id },
            { initiatedBy: FamilyLinkInitiator.CHILD, parentId: user.id },
          ],
        },
        select: {
          id: true,
          initiatedBy: true,
          parent: { select: NAME },
          child: { select: NAME },
        },
      }),
      unreadCounts(user),
    ]);
  const [readNews, awaiting] = await Promise.all([
    readNewsIds(
      user.id,
      news.map((p) => p.id),
    ),
    awaitingResponse(user.id, news),
  ]);

  const setup = await loadSetupChecklist(user);
  const setupDone = setupProgress(setup).complete;

  const hasTodos =
    followRequests > 0 || vouches.length > 0 || familyLinks.length > 0;

  return (
    <>
      <PageHeader title={t("greeting", { name: displayName(user, locale) })} />

      {setupDone ? (
        <div className="mb-6 empty:hidden">
          <LineBanner user={user} />
        </div>
      ) : (
        <SetupChecklist items={setup} />
      )}

      {hasTodos ? (
        <section aria-labelledby="todo-heading" className="mb-6">
          <h2 id="todo-heading" className="mb-2 text-lg font-semibold">
            {t("todo.title")}
          </h2>
          <ul className="space-y-2">
            {followRequests > 0 ? (
              <ActionItem href="/app/follows">
                {t("todo.followRequests", { count: followRequests })}
              </ActionItem>
            ) : null}
            {vouches.map((v) => (
              <ActionItem key={v.id} href={`/app/vouch/${v.id}`}>
                {t("todo.vouch", { name: displayName(v.request.user, locale) })}
              </ActionItem>
            ))}
            {familyLinks.map((l) => {
              const other =
                l.initiatedBy === FamilyLinkInitiator.PARENT
                  ? l.parent
                  : l.child;
              return (
                <ActionItem key={l.id} href="/app/family">
                  {t(
                    l.initiatedBy === FamilyLinkInitiator.PARENT
                      ? "todo.familyFromParent"
                      : "todo.familyFromChild",
                    {
                      name: other ? displayName(other, locale) : "—",
                    },
                  )}
                </ActionItem>
              );
            })}
          </ul>
        </section>
      ) : null}

      {unread.messages > 0 ? (
        <Link
          href="/app/news?tab=messages"
          className="mb-6 flex min-h-11 items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 font-medium text-brand-900 hover:bg-brand-100"
        >
          <Mail aria-hidden="true" className="size-5 shrink-0" />
          <span className="flex-1">
            {tn("messages.newCount", { count: unread.messages })}
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <DashboardSection
          id="events-heading"
          title={t("events.title")}
          moreHref="/app/events"
          moreLabel={t("events.more")}
        >
          {events.length === 0 ? (
            <EmptyState>{t("events.empty")}</EmptyState>
          ) : (
            <ul className="space-y-3">
              {events.map((e) => (
                <li key={e.id}>
                  <EventCard
                    event={{ ...e, myAnswer: e.rsvps[0]?.answer ?? null }}
                    locale={locale}
                  />
                </li>
              ))}
            </ul>
          )}
        </DashboardSection>

        <DashboardSection
          id="news-heading"
          title={t("news.title")}
          moreHref="/app/news"
          moreLabel={t("news.more")}
        >
          {news.length === 0 ? (
            <EmptyState>{t("news.empty")}</EmptyState>
          ) : (
            <ul className="space-y-3">
              {news.map((p) => (
                <li key={p.id}>
                  <NewsCard
                    post={p}
                    locale={locale}
                    excerpt={false}
                    needsAnswer={awaiting.has(p.id)}
                    unread={
                      !readNews.has(p.id) &&
                      !!p.publishedAt &&
                      p.publishedAt >= user.createdAt
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </DashboardSection>
      </div>
    </>
  );
}
