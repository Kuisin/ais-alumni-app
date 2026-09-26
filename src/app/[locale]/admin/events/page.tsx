import { getTranslations } from "next-intl/server";
import { TargetBadges } from "@/components/events/target-badges";
import { FallbackTag } from "@/components/news/fallback-tag";
import { buttonClass } from "@/components/ui/button";
import { Alert, EmptyState, PageHeader } from "@/components/ui/card";
import { RsvpAnswer } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { asLocale } from "@/lib/events";
import { formatDateTime, localized } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/events">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminContent" });
  return { title: t("events.title") };
}

const PAST_LIMIT = 30;

export default async function AdminEventsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/events">) {
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
    targetRoles: true,
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

  const list = (events: typeof upcoming) =>
    events.length === 0 ? (
      <EmptyState>{t("events.empty")}</EmptyState>
    ) : (
      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {events.map((e) => {
          const title = localized(e.titleJa, e.titleEn, locale);
          const going = e.rsvps.reduce((n, r) => n + 1 + r.guests, 0);
          return (
            <li key={e.id}>
              <Link
                href={`/admin/events/${e.id}`}
                className="block space-y-1 p-4 hover:bg-slate-50"
              >
                <p className="text-sm text-slate-600">
                  {formatDateTime(e.startsAt, locale)}
                </p>
                <p className="font-semibold">
                  {title.text}
                  <FallbackTag fallback={title.fallback} />
                </p>
                <div className="flex flex-wrap items-center gap-1 text-sm text-slate-600">
                  <span className="mr-2">
                    {e.capacity === null
                      ? t("events.goingCount", { going })
                      : t("events.goingOfCapacity", {
                          going,
                          capacity: e.capacity,
                        })}
                  </span>
                  <TargetBadges roles={e.targetRoles} />
                </div>
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
        actions={
          <Link href="/admin/events/new" className={buttonClass("primary")}>
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
        {list(upcoming)}
      </section>
      <section aria-labelledby="past">
        <h2 id="past" className="mb-3 text-lg font-semibold">
          {t("events.past", { limit: PAST_LIMIT })}
        </h2>
        {list(past)}
      </section>
    </>
  );
}
