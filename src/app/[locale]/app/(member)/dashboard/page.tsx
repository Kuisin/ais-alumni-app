import { getTranslations } from "next-intl/server";
import { ActionItem, DashboardSection } from "@/components/dashboard/section";
import { EventCard } from "@/components/events/event-card";
import { LineBanner } from "@/components/line/line-banner";
import { NewsCard } from "@/components/news/news-card";
import { EmptyState, PageHeader } from "@/components/ui/card";
import {
  FamilyLinkInitiator,
  FollowStatus,
  VerificationStatus,
} from "@/generated/prisma/enums";
import { toViewer } from "@/lib/authz";
import { db } from "@/lib/db";
import { asLocale } from "@/lib/events";
import { displayName } from "@/lib/format";
import { publishedWhere, targetRolesWhere } from "@/lib/news";
import { requireActive } from "@/lib/session";

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
  const now = new Date();
  const target = targetRolesWhere(toViewer(user));

  const [events, news, followRequests, vouches, familyLinks] =
    await Promise.all([
      db.event.findMany({
        where: {
          AND: [
            target,
            { OR: [{ startsAt: { gte: now } }, { endsAt: { gte: now } }] },
          ],
        },
        orderBy: { startsAt: "asc" },
        take: 3,
        select: {
          id: true,
          titleJa: true,
          titleEn: true,
          startsAt: true,
          location: true,
          rsvps: { where: { userId: user.id }, select: { answer: true } },
        },
      }),
      db.newsPost.findMany({
        where: { AND: [target, publishedWhere(now)] },
        orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
        take: 3,
        select: {
          id: true,
          titleJa: true,
          titleEn: true,
          bodyJa: true,
          bodyEn: true,
          pinned: true,
          publishedAt: true,
        },
      }),
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
    ]);

  const hasTodos =
    followRequests > 0 || vouches.length > 0 || familyLinks.length > 0;

  return (
    <>
      <PageHeader title={t("greeting", { name: displayName(user, locale) })} />

      <div className="mb-6 empty:hidden">
        <LineBanner user={user} />
      </div>

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
                  <NewsCard post={p} locale={locale} excerpt={false} />
                </li>
              ))}
            </ul>
          )}
        </DashboardSection>
      </div>
    </>
  );
}
