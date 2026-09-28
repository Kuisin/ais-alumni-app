import { ScanLine } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { RsvpForm } from "@/components/events/rsvp-form";
import { TicketCard } from "@/components/events/ticket-card";
import { FallbackTag } from "@/components/news/fallback-tag";
import { MarkdownBody } from "@/components/news/markdown-body";
import { BackLink } from "@/components/ui/back-link";
import { buttonClass } from "@/components/ui/button";
import { Alert, Card } from "@/components/ui/card";
import { ViewEdit } from "@/components/ui/view-edit";
import { RsvpAnswer } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import { awaitingApproval } from "@/lib/approval";
import { db } from "@/lib/db";
import { canCheckIn } from "@/lib/event-staff";
import { checkInPath } from "@/lib/event-tickets";
import {
  asLocale,
  isRsvpOpen,
  mapLink,
  remainingSpots,
  rsvpClosesAt,
} from "@/lib/events";
import { formatDateTime, localized } from "@/lib/format";
import { inAudience } from "@/lib/news-visibility";
import { senderLabel } from "@/lib/sender";
import { getCurrentUser, requireActive } from "@/lib/session";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Event visible to the current user, or null (not found / not targeted). */
const loadEvent = cache(async (id: string) => {
  const user = await getCurrentUser();
  if (!user || id.length > 64) return null;
  const event = await db.event.findUnique({ where: { id } });
  if (!event || awaitingApproval(event) || !(await inAudience(user, event)))
    return null;
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
  const [going, mine, checkIn, staff] = await Promise.all([
    db.rsvp.aggregate({
      where: { eventId: id, answer: RsvpAnswer.GOING },
      _count: { _all: true },
      _sum: { guests: true },
    }),
    db.rsvp.findUnique({
      where: { eventId_userId: { eventId: id, userId: user.id } },
      select: { answer: true, guests: true },
    }),
    db.eventCheckIn.findUnique({
      where: { eventId_userId: { eventId: id, userId: user.id } },
      select: { checkedInAt: true },
    }),
    canCheckIn(user, id),
  ]);
  const goingTotal = going._count._all + (going._sum.guests ?? 0);
  const remaining = remainingSpots(event.capacity, goingTotal);
  const title = localized(event.titleJa, event.titleEn, locale);
  const body = localized(event.bodyJa, event.bodyEn, locale);
  const map = mapLink(event.mapUrl, event.location);
  const open = isRsvpOpen(event);
  const closesAt = rsvpClosesAt(event);
  // "13 days left" / "5 hours left" next to the RSVP deadline.
  const msLeft = closesAt.getTime() - Date.now();
  const left =
    open && msLeft > 0
      ? msLeft >= DAY_MS
        ? { unit: "days" as const, count: Math.floor(msLeft / DAY_MS) }
        : {
            unit: "hours" as const,
            count: Math.max(1, Math.ceil(msLeft / HOUR_MS)),
          }
      : null;
  const full = remaining === 0 && mine?.answer !== RsvpAnswer.GOING;

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <div>
        <BackLink href="/app/events">{t("backToList")}</BackLink>
        <h1 className="text-2xl font-bold tracking-tight break-words">
          {title.text || t("untitled")}
          <FallbackTag fallback={title.fallback} />
        </h1>
        {staff ? (
          <Link
            href={checkInPath(event.id)}
            className={buttonClass("secondary", "mt-3")}
          >
            <ScanLine aria-hidden="true" className="size-4" />
            {t("checkIn.open")}
          </Link>
        ) : null}
      </div>

      {(mine && mine.answer !== RsvpAnswer.NOT_GOING) || checkIn ? (
        <TicketCard
          eventId={event.id}
          user={user}
          checkedInAt={checkIn?.checkedInAt ?? null}
          locale={locale}
        />
      ) : null}

      <Card>
        <dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-[10rem_1fr]">
          <div className="sm:contents">
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
          </div>
          <div className="sm:contents">
            <dt className="font-medium text-slate-600">{t("organizer")}</dt>
            <dd>{await senderLabel(event, locale)}</dd>
          </div>
          {event.location || map ? (
            <div className="sm:contents">
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
            </div>
          ) : null}
          <div className="sm:contents">
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
          </div>
          <div className="sm:contents">
            <dt className="font-medium text-slate-600">{t("deadline")}</dt>
            <dd>
              <time dateTime={closesAt.toISOString()}>
                {formatDateTime(closesAt, locale)}
              </time>
              {left ? (
                <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                  {t(`deadlineLeft.${left.unit}`, { count: left.count })}
                </span>
              ) : null}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Answering comes right after when / where / deadline. */}
      <Card id="rsvp" className="scroll-mt-20">
        <h2 className="mb-3 text-lg font-semibold">{t("rsvp.title")}</h2>
        {!open ? (
          <div className="mb-3">
            <Alert tone="warning">
              {event.rsvpClosedAt
                ? t("rsvp.closedByOrganizer")
                : t("rsvp.closed")}
            </Alert>
          </div>
        ) : full ? (
          <div className="mb-3">
            <Alert tone="warning">{t("rsvp.full")}</Alert>
          </div>
        ) : null}
        {/* After answering: the answer, with Edit while RSVPs are open. */}
        <ViewEdit
          canEdit={open}
          startEditing={open && !mine}
          editLabel={t("rsvp.change")}
          view={
            <p className="text-sm text-slate-700">
              {mine
                ? t("rsvp.current", {
                    answer: t(`answer.${mine.answer}`),
                    guests: mine.guests,
                  })
                : t("rsvp.none")}
            </p>
          }
        >
          <RsvpForm eventId={event.id} current={mine} />
        </ViewEdit>
      </Card>

      {body.text ? (
        <Card>
          <section aria-labelledby="event-details-title">
            <h2 id="event-details-title" className="mb-3 text-lg font-semibold">
              {t("details")}
            </h2>
            {body.fallback ? (
              <p className="mb-2">
                <FallbackTag fallback={body.fallback} />
              </p>
            ) : null}
            <MarkdownBody source={body.text} />
          </section>
        </Card>
      ) : null}
    </article>
  );
}
