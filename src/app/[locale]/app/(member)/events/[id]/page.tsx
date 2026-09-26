import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { RsvpForm } from "@/components/events/rsvp-form";
import { LineRsvpPrompt } from "@/components/line/line-rsvp-prompt";
import { FallbackTag } from "@/components/news/fallback-tag";
import { MarkdownBody } from "@/components/news/markdown-body";
import { Alert, Card } from "@/components/ui/card";
import { RsvpAnswer } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import { isTargeted, toViewer } from "@/lib/authz";
import { db } from "@/lib/db";
import {
  asLocale,
  isRsvpOpen,
  mapLink,
  remainingSpots,
  rsvpClosesAt,
} from "@/lib/events";
import { formatDateTime, localized } from "@/lib/format";
import { getCurrentUser, requireActive } from "@/lib/session";

/** Event visible to the current user, or null (not found / not targeted). */
const loadEvent = cache(async (id: string) => {
  const user = await getCurrentUser();
  if (!user || id.length > 64) return null;
  const event = await db.event.findUnique({ where: { id } });
  if (!event || !isTargeted(event.targetRoles, toViewer(user))) return null;
  return event;
});

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/events/[id]">) {
  const { locale, id } = await params;
  const event = await loadEvent(id);
  if (!event) return {};
  return {
    title: localized(event.titleJa, event.titleEn, asLocale(locale)).text,
  };
}

export default async function EventDetailPage({
  params,
}: PageProps<"/[locale]/app/events/[id]">) {
  const { id, locale: rawLocale } = await params;
  const locale = asLocale(rawLocale);
  const user = await requireActive();
  const event = await loadEvent(id);
  if (!event) notFound();

  const t = await getTranslations("events");
  const [going, mine] = await Promise.all([
    db.rsvp.aggregate({
      where: { eventId: id, answer: RsvpAnswer.GOING },
      _count: { _all: true },
      _sum: { guests: true },
    }),
    db.rsvp.findUnique({
      where: { eventId_userId: { eventId: id, userId: user.id } },
      select: { answer: true, guests: true },
    }),
  ]);
  const goingTotal = going._count._all + (going._sum.guests ?? 0);
  const remaining = remainingSpots(event.capacity, goingTotal);
  const title = localized(event.titleJa, event.titleEn, locale);
  const body = localized(event.bodyJa, event.bodyEn, locale);
  const map = mapLink(event.mapUrl, event.location);
  const open = isRsvpOpen(event);
  const closesAt = rsvpClosesAt(event);
  const full = remaining === 0 && mine?.answer !== RsvpAnswer.GOING;

  return (
    <article className="space-y-6">
      <div>
        <Link href="/app/events" className="text-sm text-brand-700 underline">
          {t("backToList")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          {title.text || t("untitled")}
          <FallbackTag fallback={title.fallback} />
        </h1>
      </div>

      <Card>
        <dl className="grid gap-3 text-sm sm:grid-cols-[10rem_1fr]">
          <dt className="font-medium text-slate-600">{t("when")}</dt>
          <dd>
            <time dateTime={event.startsAt.toISOString()}>
              {formatDateTime(event.startsAt, locale)}
            </time>
            {event.endsAt ? (
              <>
                {" – "}
                <time dateTime={event.endsAt.toISOString()}>
                  {formatDateTime(event.endsAt, locale)}
                </time>
              </>
            ) : null}
            <span className="ml-1 text-slate-500">{t("jst")}</span>
          </dd>
          {event.location || map ? (
            <>
              <dt className="font-medium text-slate-600">{t("where")}</dt>
              <dd>
                {event.location}
                {map ? (
                  <a
                    href={map}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 inline-flex min-h-11 items-center text-brand-700 underline sm:min-h-0"
                  >
                    {t("openMap")}
                  </a>
                ) : null}
              </dd>
            </>
          ) : null}
          <dt className="font-medium text-slate-600">{t("capacity")}</dt>
          <dd>
            {event.capacity === null
              ? t("capacityUnlimited", { going: goingTotal })
              : t("capacityLimited", {
                  capacity: event.capacity,
                  going: goingTotal,
                  remaining: remaining ?? 0,
                })}
          </dd>
          <dt className="font-medium text-slate-600">{t("deadline")}</dt>
          <dd>
            <time dateTime={closesAt.toISOString()}>
              {formatDateTime(closesAt, locale)}
            </time>
          </dd>
        </dl>
      </Card>

      {body.text ? (
        <section aria-label={t("details")}>
          {body.fallback ? (
            <p className="mb-2">
              <FallbackTag fallback={body.fallback} />
            </p>
          ) : null}
          <MarkdownBody source={body.text} />
        </section>
      ) : null}

      <Card>
        <h2 className="mb-3 text-lg font-semibold">{t("rsvp.title")}</h2>
        {mine ? (
          <p className="mb-3 text-sm text-slate-700">
            {t("rsvp.current", {
              answer: t(`answer.${mine.answer}`),
              guests: mine.guests,
            })}
          </p>
        ) : null}
        {!open ? (
          <Alert tone="warning">{t("rsvp.closed")}</Alert>
        ) : (
          <>
            {full ? (
              <div className="mb-3">
                <Alert tone="warning">{t("rsvp.full")}</Alert>
              </div>
            ) : null}
            <RsvpForm eventId={event.id} current={mine} />
          </>
        )}
      </Card>

      {mine && mine.answer !== RsvpAnswer.NOT_GOING ? (
        <LineRsvpPrompt user={user} returnTo={`/app/events/${event.id}`} />
      ) : null}
    </article>
  );
}
