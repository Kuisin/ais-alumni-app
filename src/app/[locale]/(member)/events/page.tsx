import { getTranslations } from "next-intl/server";
import { EventCard } from "@/components/events/event-card";
import { Pager, parsePage } from "@/components/news/pager";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Link } from "@/i18n/navigation";
import { toViewer } from "@/lib/authz";
import { db } from "@/lib/db";
import { asLocale } from "@/lib/events";
import { EVENTS_PAGE_SIZE, targetRolesWhere } from "@/lib/news";
import { requireActive } from "@/lib/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/events">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "events" });
  return { title: t("title") };
}

export default async function EventsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/events">) {
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

  const rows = await db.event.findMany({
    where: { AND: [targetRolesWhere(toViewer(user)), timeWhere] },
    orderBy: { startsAt: tab === "past" ? "desc" : "asc" },
    skip: (page - 1) * EVENTS_PAGE_SIZE,
    take: EVENTS_PAGE_SIZE + 1,
    select: {
      id: true,
      titleJa: true,
      titleEn: true,
      startsAt: true,
      location: true,
      rsvps: { where: { userId: user.id }, select: { answer: true } },
    },
  });
  const hasNext = rows.length > EVENTS_PAGE_SIZE;
  const events = rows.slice(0, EVENTS_PAGE_SIZE);

  const tabs = [
    { key: "upcoming", label: t("tabs.upcoming"), href: "/events" },
    { key: "past", label: t("tabs.past"), href: "/events?tab=past" },
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
        <EmptyState>
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
        pathname="/events"
        page={page}
        hasNext={hasNext}
        query={tab === "past" ? { tab: "past" } : {}}
      />
    </>
  );
}
