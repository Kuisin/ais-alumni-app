import { CalendarDays, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EventCard } from "@/components/events/event-card";
import { Pager, parsePage } from "@/components/news/pager";
import { buttonClass } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";
import { eventApprovedWhere } from "@/lib/approval";
import { getNewsScope } from "@/lib/broadcasts";
import { db } from "@/lib/db";
import { asLocale } from "@/lib/events";
import { EVENTS_PAGE_SIZE } from "@/lib/news";
import { filterByAudience } from "@/lib/news-visibility";
import { senderLabels } from "@/lib/sender";
import { requireActive } from "@/lib/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/events">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "events" });
  return { title: t("title") };
}

export default async function EventsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/app/events">) {
  const locale = asLocale((await params).locale);
  const sp = await searchParams;
  const tab = sp.tab === "past" ? "past" : "upcoming";
  const page = parsePage(sp.page);
  const user = await requireActive();
  const t = await getTranslations("events");
  const now = new Date();

  // "Upcoming" includes events in progress (started, not yet ended).
  const timeWhere =
    tab === "past"
      ? {
          startsAt: { lt: now },
          OR: [{ endsAt: null }, { endsAt: { lt: now } }],
        }
      : { OR: [{ startsAt: { gte: now } }, { endsAt: { gte: now } }] };

  // Audience (same conditions as ニュース) is matched in code: 学年 and
  // individually chosen members can't be expressed in SQL.
  const all = await db.event.findMany({
    // A 同窓会委員's event shows once approved.
    where: { ...timeWhere, AND: [eventApprovedWhere] },
    orderBy: { startsAt: tab === "past" ? "desc" : "asc" },
    take: 1000,
    select: {
      audience: true,
      targetAudiences: true,
      targetRoles: true,
      id: true,
      titleJa: true,
      titleEn: true,
      startsAt: true,
      location: true,
      senderRole: true,
      rsvps: { where: { userId: user.id }, select: { answer: true } },
    },
  });
  const rows = (await filterByAudience(user, all)).slice(
    (page - 1) * EVENTS_PAGE_SIZE,
    page * EVENTS_PAGE_SIZE + 1,
  );
  const hasNext = rows.length > EVENTS_PAGE_SIZE;
  const events = rows.slice(0, EVENTS_PAGE_SIZE);
  const [senders, scope] = await Promise.all([
    senderLabels(events, locale),
    getNewsScope(user),
  ]);

  const tabs = [
    { key: "upcoming", label: t("tabs.upcoming"), href: "/app/events" },
    { key: "past", label: t("tabs.past"), href: "/app/events?tab=past" },
  ] as const;

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          // Same authors as ニュース (admins, teachers, 同窓会委員, 学年代表).
          scope ? (
            <Link href="/app/events/new" className={buttonClass("primary")}>
              <Plus aria-hidden="true" className="size-4" />
              {t("create")}
            </Link>
          ) : null
        }
      />
      <Tabs
        label={t("tabs.label")}
        className="mb-4"
        items={tabs.map((x) => ({
          href: x.href,
          label: x.label,
          active: tab === x.key,
        }))}
      />

      <div data-results>
        {events.length === 0 ? (
          <EmptyState icon={<CalendarDays />}>
            {tab === "past" ? t("emptyPast") : t("emptyUpcoming")}
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {events.map((e) => (
              <li key={e.id}>
                <EventCard
                  event={{ ...e, myAnswer: e.rsvps[0]?.answer ?? null }}
                  locale={locale}
                  sender={senders.get(e.id)}
                />
              </li>
            ))}
          </ul>
        )}
        <Pager
          pathname="/app/events"
          page={page}
          hasNext={hasNext}
          query={tab === "past" ? { tab: "past" } : {}}
        />
      </div>
    </>
  );
}
