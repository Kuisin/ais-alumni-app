import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { deleteEventAction } from "@/app/actions/admin-content";
import { ConfirmDeleteForm } from "@/components/events/confirm-delete";
import { EventForm } from "@/components/events/event-form";
import { buttonClass } from "@/components/ui/button";
import { Alert, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { answerSummary, asLocale, headcount } from "@/lib/events";
import {
  displayName,
  formatDateTime,
  localized,
  toJstLocalInput,
} from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/admin/events/[id]">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminContent" });
  return { title: t("events.edit") };
}

const ANSWER_ORDER = { GOING: 0, MAYBE: 1, NOT_GOING: 2 } as const;

export default async function AdminEventPage({
  params,
  searchParams,
}: PageProps<"/[locale]/app/admin/events/[id]">) {
  const { id, locale: rawLocale } = await params;
  const locale = asLocale(rawLocale);
  const created = (await searchParams).created === "1";
  await requireAdmin();
  if (id.length > 64) notFound();
  const event = await db.event.findUnique({
    where: { id },
    include: {
      rsvps: {
        orderBy: { updatedAt: "desc" },
        include: {
          user: { select: { id: true, nameRomaji: true, nameKanji: true } },
        },
      },
    },
  });
  if (!event) notFound();
  const t = await getTranslations("adminContent");
  const te = await getTranslations("events");

  const summary = answerSummary(event.rsvps);
  const rsvps = [...event.rsvps].sort(
    (a, b) => ANSWER_ORDER[a.answer] - ANSWER_ORDER[b.answer],
  );
  const title = localized(event.titleJa, event.titleEn, locale).text;

  return (
    <>
      <Link
        href="/app/admin/events"
        className="text-sm text-brand-700 underline"
      >
        {t("events.backToList")}
      </Link>
      <div className="mt-2">
        <PageHeader
          title={title}
          description={formatDateTime(event.startsAt, locale)}
          actions={
            <Link
              href={`/app/events/${event.id}`}
              className={buttonClass("secondary")}
            >
              {t("events.viewAsMember")}
            </Link>
          }
        />
      </div>
      {created ? (
        <div className="mb-4">
          <Alert tone="success">{t("events.created")}</Alert>
        </div>
      ) : null}

      <div className="space-y-8">
        <section aria-labelledby="attendees">
          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 id="attendees" className="text-lg font-semibold">
                {t("attendees.title")}
              </h2>
              {/* API route: plain <a>, not locale-prefixed. */}
              <a
                href={`/api/admin/events/${event.id}/csv`}
                className={buttonClass("secondary")}
                download
              >
                {t("attendees.csv")}
              </a>
            </div>
            <dl className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-3">
                <dt className="text-slate-600">{t("attendees.headcount")}</dt>
                <dd className="text-xl font-semibold">
                  {headcount(event.rsvps)}
                  {event.capacity !== null ? (
                    <span className="text-sm font-normal">
                      {" "}
                      / {event.capacity}
                    </span>
                  ) : null}
                </dd>
              </div>
              {(["GOING", "MAYBE", "NOT_GOING"] as const).map((a) => (
                <div key={a} className="rounded-lg bg-slate-50 p-3">
                  <dt className="text-slate-600">{te(`answer.${a}`)}</dt>
                  <dd className="text-xl font-semibold">
                    {summary[a].count}
                    {a !== "NOT_GOING" ? (
                      <span className="ml-1 text-sm font-normal">
                        {t("attendees.plusGuests", {
                          guests: summary[a].guests,
                        })}
                      </span>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
            {rsvps.length === 0 ? (
              <EmptyState>{t("attendees.empty")}</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <thead className="border-b border-slate-200 text-slate-600">
                    <tr>
                      <th scope="col" className="py-2 pr-3 font-medium">
                        {t("attendees.name")}
                      </th>
                      <th scope="col" className="py-2 pr-3 font-medium">
                        {t("attendees.answer")}
                      </th>
                      <th scope="col" className="py-2 pr-3 font-medium">
                        {t("attendees.guests")}
                      </th>
                      <th scope="col" className="py-2 font-medium">
                        {t("attendees.updated")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rsvps.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2 pr-3">
                          {displayName(r.user, locale)}
                        </td>
                        <td className="py-2 pr-3">
                          {te(`answer.${r.answer}`)}
                        </td>
                        <td className="py-2 pr-3">{r.guests}</td>
                        <td className="py-2 text-slate-600">
                          {formatDateTime(r.updatedAt, locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>

        <section aria-labelledby="edit">
          <Card>
            <h2 id="edit" className="mb-4 text-lg font-semibold">
              {t("events.edit")}
            </h2>
            <EventForm
              values={{
                id: event.id,
                titleJa: event.titleJa ?? "",
                titleEn: event.titleEn ?? "",
                bodyJa: event.bodyJa ?? "",
                bodyEn: event.bodyEn ?? "",
                startsAt: toJstLocalInput(event.startsAt),
                endsAt: event.endsAt ? toJstLocalInput(event.endsAt) : "",
                rsvpDeadline: event.rsvpDeadline
                  ? toJstLocalInput(event.rsvpDeadline)
                  : "",
                location: event.location ?? "",
                mapUrl: event.mapUrl ?? "",
                capacity: event.capacity === null ? "" : String(event.capacity),
                targetRoles: event.targetRoles,
              }}
            />
          </Card>
        </section>

        <section aria-labelledby="danger">
          <Card className="border-red-200">
            <h2 id="danger" className="mb-2 text-lg font-semibold text-red-800">
              {t("events.deleteTitle")}
            </h2>
            <p className="mb-3 text-sm text-slate-700">
              {t("events.deleteHint")}
            </p>
            <ConfirmDeleteForm
              action={deleteEventAction}
              id={event.id}
              message={t("events.deleteConfirm")}
            />
          </Card>
        </section>
      </div>
    </>
  );
}
