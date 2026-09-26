import { useTranslations } from "next-intl";
import { FallbackTag } from "@/components/news/fallback-tag";
import { Badge } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { RsvpAnswerValue } from "@/lib/events";
import { formatDateTime, localized } from "@/lib/format";

export type EventCardData = {
  id: string;
  titleJa: string | null;
  titleEn: string | null;
  startsAt: Date;
  location: string | null;
  myAnswer: RsvpAnswerValue | null;
};

const ANSWER_TONE = {
  GOING: "green",
  MAYBE: "amber",
  NOT_GOING: "slate",
} as const;

/** One event row in lists (member list and dashboard). */
export function EventCard({
  event,
  locale,
}: {
  event: EventCardData;
  locale: "ja" | "en";
}) {
  const t = useTranslations("events");
  const title = localized(event.titleJa, event.titleEn, locale);
  return (
    <Link
      href={`/app/events/${event.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-brand-300 focus-visible:outline-2"
    >
      <p className="text-sm font-medium text-brand-700">
        <time dateTime={event.startsAt.toISOString()}>
          {formatDateTime(event.startsAt, locale)}
        </time>
      </p>
      <h3 className="mt-1 font-semibold text-slate-900">
        {title.text || t("untitled")}
        <FallbackTag fallback={title.fallback} />
      </h3>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
        {event.location ? <span>{event.location}</span> : null}
        {event.myAnswer ? (
          <Badge tone={ANSWER_TONE[event.myAnswer]}>
            {t("myAnswer", { answer: t(`answer.${event.myAnswer}`) })}
          </Badge>
        ) : null}
      </div>
    </Link>
  );
}
