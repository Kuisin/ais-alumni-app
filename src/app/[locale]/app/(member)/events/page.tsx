import { CalendarDays } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EventCard } from "@/components/events/event-card";
import { Pager, parsePage } from "@/components/news/pager";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { asLocale } from "@/lib/events";
import { EVENTS_PAGE_SIZE } from "@/lib/news";
import { filterByAudience } from "@/lib/news-visibility";
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
    where: timeWhere,
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
      rsvps: { where: { userId: user.id }, select: { answer: true } },
    },
  });
  const rows = (await filterByAudience(user, all)).slice(
    (page - 1) * EVENTS_PAGE_SIZE,
    page * EVENTS_PAGE_SIZE + 1,
  );
  const hasNext = rows.length > EVENTS_PAGE_SIZE;
  const events = rows.slice(0, EVENTS_PAGE_SIZE);

  const tabs = [
    { key: "upcoming", label: t("tabs.upcoming"), href: "/app/events" },
    { key: "past", label: t("tabs.past"), href: "/app/events?tab=past" },
  ] as const;

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <nav
        aria-label={t("tabs.label")}
        className="mb-4 flex gap-2 border-b border-slate-200"
      >
        {tabs.map((x) => (
          <Link
            key={x.key}
            href={x.href}
            aria-current={tab === x.key ? "page" : undefined}
            className={cn(
              "-mb-px flex min-h-11 items-center border-b-2 px-3 text-sm font-medium",
              tab === x.key
                ? "border-brand-700 text-brand-800"
                : "border-transparent text-slate-600 hover:text-slate-900",
            )}
          >
            {x.label}
          </Link>
        ))}
      </nav>

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
    </>
  );
}
