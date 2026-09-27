import { CalendarDays, ChevronRight, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { TargetBadges } from "@/components/events/target-badges";
import { FallbackTag } from "@/components/news/fallback-tag";
import { buttonClass } from "@/components/ui/button";
import { Alert, Badge, EmptyState, PageHeader } from "@/components/ui/card";
import { RsvpAnswer } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { asLocale } from "@/lib/events";
import { formatDateTime, localized } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/admin/events">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminContent" });
  return { title: t("events.title") };
}

const PAST_LIMIT = 30;

export default async function AdminEventsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/app/admin/events">) {
  const locale = asLocale((await params).locale);
  const deleted = (await searchParams).deleted === "1";
  await requireAdmin();
  const t = await getTranslations("adminContent");
  const now = new Date();

  const select = {
    id: true,
    titleJa: true,
    titleEn: true,
    startsAt: true,
    capacity: true,
    rsvpDeadline: true,
    targetRoles: true,
    targetAudiences: true,
    rsvps: { where: { answer: RsvpAnswer.GOING }, select: { guests: true } },
  } as const;
  const [upcoming, past] = await Promise.all([
    db.event.findMany({
      where: { startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      select,
    }),
    db.event.findMany({
      where: { startsAt: { lt: now } },
      orderBy: { startsAt: "desc" },
      take: PAST_LIMIT,
      select,
    }),
  ]);

  const status = (e: (typeof upcoming)[number], going: number) =>
    e.capacity !== null && going >= e.capacity
      ? ({ tone: "amber", label: t("events.status.full") } as const)
      : e.rsvpDeadline && e.rsvpDeadline < now
        ? ({ tone: "slate", label: t("events.status.closed") } as const)
        : ({ tone: "green", label: t("events.status.open") } as const);

  const list = (events: typeof upcoming, isPast: boolean) =>
    events.length === 0 ? (
      isPast ? (
        <EmptyState compact>{t("events.emptyPast")}</EmptyState>
      ) : (
        <EmptyState
          icon={<CalendarDays />}
          hint={t("events.emptyHint")}
          action={
            <Link
              href="/app/admin/events/new"
              className={buttonClass("secondary")}
            >
              <Plus aria-hidden="true" className="size-4" />
              {t("events.new")}
            </Link>
          }
        >
          {t("events.empty")}
        </EmptyState>
      )
    ) : (
      <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {events.map((e) => {
          const title = localized(e.titleJa, e.titleEn, locale);
          const going = e.rsvps.reduce((n, r) => n + 1 + r.guests, 0);
          const st = isPast ? null : status(e, going);
          return (
            <li key={e.id}>
              <Link
                href={`/app/admin/events/${e.id}`}
                className="group flex items-center gap-3 p-4 transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    {st ? <Badge tone={st.tone}>{st.label}</Badge> : null}
                    <time dateTime={e.startsAt.toISOString()}>
                      {formatDateTime(e.startsAt, locale)}
                    </time>
                  </p>
                  <p className="font-semibold group-hover:text-brand-800">
                    {title.text}
                    <FallbackTag fallback={title.fallback} />
                  </p>
                  <div className="flex flex-wrap items-center gap-1 text-sm text-slate-600">
                    <span className="mr-2 tabular-nums">
                      {e.capacity === null
                        ? t("events.goingCount", { going })
                        : t("events.goingOfCapacity", {
                            going,
                            capacity: e.capacity,
                          })}
                    </span>
                    <TargetBadges target={e} />
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
    );

  return (
    <>
      <PageHeader
        title={t("events.title")}
        description={t("events.description")}
        actions={
          <Link href="/app/admin/events/new" className={buttonClass("primary")}>
            <Plus aria-hidden="true" className="size-4" />
            {t("events.new")}
          </Link>
        }
      />
      {deleted ? (
        <div className="mb-4">
          <Alert tone="success">{t("events.deleted")}</Alert>
        </div>
      ) : null}
      <section aria-labelledby="upcoming" className="mb-8">
        <h2 id="upcoming" className="mb-3 text-lg font-semibold">
          {t("events.upcoming")}
        </h2>
        {list(upcoming, false)}
      </section>
      <section aria-labelledby="past">
        <h2 id="past" className="mb-3 text-lg font-semibold">
          {t("events.past", { limit: PAST_LIMIT })}
        </h2>
        {list(past, true)}
      </section>
    </>
  );
}
