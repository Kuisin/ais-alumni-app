import { Download, Eye, ListChecks } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { deleteEventAction } from "@/app/actions/admin-content";
import { EventForm } from "@/components/events/event-form";
import { buttonClass } from "@/components/ui/button";
import { Alert, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { loadCohortOptions } from "@/lib/cohorts-db";
import { db } from "@/lib/db";
import { answerSummary, asLocale, headcount } from "@/lib/events";
import {
  displayName,
  formatDateTime,
  localized,
  toJstLocalInput,
} from "@/lib/format";
import { specFromPost } from "@/lib/news-audience";
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
  const audience = specFromPost(event);
  const [cohorts, audienceMembers] = await Promise.all([
    loadCohortOptions(locale === "en" ? "en" : "ja"),
    audience.userIds.length
      ? db.user.findMany({
          where: { id: { in: audience.userIds } },
          select: { id: true, nameRomaji: true, nameKanji: true },
        })
      : [],
  ]);
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
        className="inline-flex min-h-11 items-center text-sm text-brand-700 underline"
      >
        {t("events.backToList")}
      </Link>
      <div className="mt-1">
        <PageHeader
          title={title}
          description={formatDateTime(event.startsAt, locale)}
          actions={
            <Link
              href={`/app/events/${event.id}`}
              className={buttonClass("secondary")}
            >
              <Eye aria-hidden="true" className="size-4" />
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

      {/* Phones/tablets: summary, form, list stacked. xl: summary in a sticky right column. */}
      <div className="space-y-8 xl:grid xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start xl:gap-6 xl:space-y-0">
        <aside
          aria-labelledby="attendees"
          className="xl:sticky xl:top-20 xl:col-start-2 xl:row-start-1"
        >
          <Card>
            <h2 id="attendees" className="mb-3 text-lg font-semibold">
              {t("attendees.title")}
            </h2>
            <dl className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 xl:grid-cols-2">
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
                      <span className="block text-xs font-normal text-slate-600">
                        {t("attendees.plusGuests", {
                          guests: summary[a].guests,
                        })}
                      </span>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:flex-col">
              {/* API route: plain <a>, not locale-prefixed. */}
              <a
                href={`/api/admin/events/${event.id}/csv`}
                className={buttonClass(
                  "secondary",
                  "w-full sm:w-auto xl:w-full",
                )}
                download
              >
                <Download aria-hidden="true" className="size-4" />
                {t("attendees.csv")}
              </a>
              {rsvps.length > 0 ? (
                <a
                  href="#attendee-list"
                  className={buttonClass("ghost", "w-full sm:w-auto xl:w-full")}
                >
                  <ListChecks aria-hidden="true" className="size-4" />
                  {t("attendees.jumpToList")}
                </a>
              ) : null}
            </div>
          </Card>
        </aside>

        <div className="min-w-0 space-y-8 xl:col-start-1 xl:row-start-1">
          <section aria-labelledby="edit">
            <h2 id="edit" className="mb-3 text-lg font-semibold">
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
                audience,
                audienceMembers: audienceMembers.map((m) => ({
                  id: m.id,
                  name: m.nameRomaji ?? m.nameKanji ?? "—",
                  kanji: m.nameRomaji ? m.nameKanji : null,
                })),
              }}
              cohorts={cohorts}
              deleteAction={{
                action: deleteEventAction,
                message: `${t("events.deleteConfirm")}\n${t("events.deleteHint")}`,
              }}
            />
          </section>

          <section aria-labelledby="attendee-list" className="scroll-mt-20">
            <Card>
              <h2 id="attendee-list" className="mb-3 text-lg font-semibold">
                {t("attendees.list")}
              </h2>
              {rsvps.length === 0 ? (
                <EmptyState>{t("attendees.empty")}</EmptyState>
              ) : (
                <div className="relative overflow-x-auto">
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
        </div>
      </div>
    </>
  );
}
