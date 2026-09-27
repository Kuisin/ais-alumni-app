import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  type Attendee,
  CheckInBoard,
} from "@/components/events/check-in-board";
import { BackLink } from "@/components/ui/back-link";
import { Alert } from "@/components/ui/card";
import { RsvpAnswer } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { canCheckIn } from "@/lib/event-staff";
import { asLocale } from "@/lib/events";
import { formatDateTime, localized } from "@/lib/format";
import { requireActive } from "@/lib/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/events/[id]/check-in">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "events.checkIn" });
  return { title: t("title") };
}

/** Reception at the event: staff scan QR tickets or tick people off (§10). */
export default async function CheckInPage({
  params,
  searchParams,
}: PageProps<"/[locale]/app/events/[id]/check-in">) {
  const { id, locale: rawLocale } = await params;
  const locale = asLocale(rawLocale);
  const sp = await searchParams;
  const token = typeof sp.t === "string" ? sp.t : null;
  const user = await requireActive();
  if (id.length > 64) notFound();
  const t = await getTranslations("events");
  if (!(await canCheckIn(user, id))) {
    return (
      <div className="space-y-4">
        <BackLink href={`/app/events/${id}`}>{t("backToList")}</BackLink>
        <Alert tone="warning">{t("checkIn.staffOnly")}</Alert>
      </div>
    );
  }
  const event = await db.event.findUnique({
    where: { id },
    select: {
      id: true,
      titleJa: true,
      titleEn: true,
      startsAt: true,
      rsvps: {
        where: { answer: { in: [RsvpAnswer.GOING, RsvpAnswer.MAYBE] } },
        select: {
          answer: true,
          guests: true,
          user: { select: { id: true, nameRomaji: true, nameKanji: true } },
        },
      },
      checkIns: {
        select: {
          checkedInAt: true,
          user: { select: { id: true, nameRomaji: true, nameKanji: true } },
        },
      },
    },
  });
  if (!event) notFound();

  const byId = new Map<string, Attendee>();
  const person = (u: {
    id: string;
    nameRomaji: string | null;
    nameKanji: string | null;
  }) => ({
    id: u.id,
    name: u.nameRomaji ?? u.nameKanji ?? "—",
    kanji: u.nameRomaji ? u.nameKanji : null,
  });
  for (const r of event.rsvps)
    byId.set(r.user.id, {
      ...person(r.user),
      answer: r.answer,
      guests: r.guests,
      checkedInAt: null,
    });
  for (const c of event.checkIns) {
    const a = byId.get(c.user.id) ?? {
      ...person(c.user),
      answer: null,
      guests: 0,
      checkedInAt: null,
    };
    byId.set(c.user.id, { ...a, checkedInAt: c.checkedInAt.toISOString() });
  }
  const attendees = [...byId.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const title = localized(event.titleJa, event.titleEn, locale).text;

  return (
    <div className="space-y-6">
      <div>
        <BackLink href={`/app/events/${event.id}`}>{title}</BackLink>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("checkIn.title")}
        </h1>
        <p className="text-sm text-slate-600">
          {title} · {formatDateTime(event.startsAt, locale)}
        </p>
      </div>
      <CheckInBoard
        eventId={event.id}
        initial={attendees}
        initialToken={token}
      />
    </div>
  );
}
