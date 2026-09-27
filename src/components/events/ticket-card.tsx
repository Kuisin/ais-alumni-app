import { CircleCheck, Ticket } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { toDataURL } from "qrcode";
import { Card } from "@/components/ui/card";
import type { Locale } from "@/generated/prisma/enums";
import { ticketToken, ticketUrl } from "@/lib/event-tickets";
import { formatDateTime } from "@/lib/format";

/** The member's QR ticket for an event; staff scan it at the reception. */
export async function TicketCard({
  eventId,
  user,
  checkedInAt,
  locale,
}: {
  eventId: string;
  user: { id: string; nameRomaji: string | null; nameKanji: string | null };
  checkedInAt: Date | null;
  locale: Locale;
}) {
  const t = await getTranslations("events.ticket");
  const name = user.nameRomaji ?? user.nameKanji ?? "";
  const qr = await toDataURL(
    ticketUrl(eventId, ticketToken(eventId, user.id)),
    {
      margin: 1,
      width: 360,
      errorCorrectionLevel: "M",
    },
  );
  return (
    <Card>
      <section aria-labelledby="ticket-title" className="space-y-3">
        <h2
          id="ticket-title"
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <Ticket aria-hidden="true" className="size-5 text-brand-700" />
          {t("title")}
        </h2>
        {checkedInAt ? (
          <p className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-900">
            <CircleCheck aria-hidden="true" className="size-5 shrink-0" />
            {t("checkedIn", { time: formatDateTime(checkedInAt, locale) })}
          </p>
        ) : null}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-5">
          {/* biome-ignore lint/performance/noImgElement: generated data URL */}
          <img
            src={qr}
            alt={t("qrAlt", { name })}
            width={200}
            height={200}
            className="size-52 rounded-lg border border-slate-200 bg-white p-2 sm:size-44"
          />
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-lg font-semibold">{name}</p>
            {user.nameRomaji && user.nameKanji ? (
              <p className="text-sm text-slate-600">{user.nameKanji}</p>
            ) : null}
            <p className="text-sm text-slate-600">{t("hint")}</p>
          </div>
        </div>
      </section>
    </Card>
  );
}
