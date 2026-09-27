import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { AudienceSummary } from "@/components/news/audience-summary";
import { MarkdownBody } from "@/components/news/markdown-body";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime } from "@/lib/format";
import type { AudienceSpec } from "@/lib/news-audience";

function Rows({ children }: { children: ReactNode }) {
  return (
    <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[9rem_1fr]">
      {children}
    </dl>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="font-medium text-slate-600">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

function Titles({ ja, en }: { ja: string | null; en: string | null }) {
  return (
    <span className="block space-y-0.5">
      {ja ? (
        <span lang="ja" className="block font-semibold">
          {ja}
        </span>
      ) : null}
      {en ? (
        <span lang="en" className="block font-semibold">
          {en}
        </span>
      ) : null}
    </span>
  );
}

function Bodies({ ja, en }: { ja: string | null; en: string | null }) {
  if (!ja && !en) return null;
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {[ja, en].map((b, i) =>
        b ? (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed ja/en pair
            key={i}
            lang={i ? "en" : "ja"}
            className="max-h-72 overflow-y-auto rounded-lg bg-slate-50 p-3"
          >
            <MarkdownBody source={b} />
          </div>
        ) : null,
      )}
    </div>
  );
}

/** Read-only event (admin edit page, before pressing Edit). */
export async function EventView({
  event,
  audience,
  locale,
}: {
  event: {
    titleJa: string | null;
    titleEn: string | null;
    bodyJa: string | null;
    bodyEn: string | null;
    startsAt: Date;
    endsAt: Date | null;
    location: string | null;
    mapUrl: string | null;
    capacity: number | null;
    rsvpDeadline: Date | null;
  };
  audience: AudienceSpec;
  locale: "ja" | "en";
}) {
  const t = await getTranslations("adminContent");
  const tc = await getTranslations("common");
  const none = <span className="text-slate-500">{tc("notSet")}</span>;
  return (
    <Card className="space-y-4">
      <Rows>
        <Row label={t("events.titles")}>
          <Titles ja={event.titleJa} en={event.titleEn} />
        </Row>
        <Row label={t("fields.startsAt")}>
          {formatDateTime(event.startsAt, locale)}
          {event.endsAt ? ` – ${formatDateTime(event.endsAt, locale)}` : ""}
        </Row>
        <Row label={t("fields.location")}>{event.location || none}</Row>
        {event.mapUrl ? (
          <Row label={t("fields.mapUrl")}>
            <span className="break-all">{event.mapUrl}</span>
          </Row>
        ) : null}
        <Row label={t("fields.capacity")}>
          {event.capacity === null ? none : event.capacity}
        </Row>
        <Row label={t("fields.rsvpDeadline")}>
          {event.rsvpDeadline
            ? formatDateTime(event.rsvpDeadline, locale)
            : none}
        </Row>
        <Row label={t("events.audience")}>
          <span className="flex flex-wrap gap-1">
            <AudienceSummary spec={audience} />
          </span>
        </Row>
      </Rows>
      <Bodies ja={event.bodyJa} en={event.bodyEn} />
    </Card>
  );
}

/** Read-only ニュース post (admin edit page, before pressing Edit). */
export async function NewsView({
  post,
  audience,
  hub,
  locale,
  coverUrl,
}: {
  post: {
    titleJa: string | null;
    titleEn: string | null;
    bodyJa: string | null;
    bodyEn: string | null;
    publishedAt: Date | null;
    notifyOnPublish: boolean;
    pinned: boolean;
    requireConfirm: boolean;
    allowComments: boolean;
    deadline: Date | null;
  };
  audience: AudienceSpec;
  hub: {
    poll: { question: string } | null;
    schedule: { options: unknown[] } | null;
    attachments: { fileName: string }[];
  };
  locale: "ja" | "en";
  coverUrl: string | null;
}) {
  const t = await getTranslations("adminContent");
  const asks = [
    post.requireConfirm ? t("hub.view.confirm") : null,
    hub.poll ? t("hub.view.poll", { question: hub.poll.question }) : null,
    hub.schedule
      ? t("hub.view.schedule", { count: hub.schedule.options.length })
      : null,
  ].filter((x): x is string => Boolean(x));
  return (
    <Card className="space-y-4">
      <Rows>
        <Row label={t("news.titles")}>
          <Titles ja={post.titleJa} en={post.titleEn} />
        </Row>
        <Row label={t("news.delivery")}>
          {post.publishedAt ? formatDateTime(post.publishedAt, locale) : "—"}
          {" · "}
          {post.notifyOnPublish ? t("news.notifyOn") : t("news.notifyOff")}
          {post.pinned ? ` · ${t("news.pinned")}` : ""}
        </Row>
        <Row label={t("sections.audience")}>
          <span className="flex flex-wrap gap-1">
            <AudienceSummary spec={audience} />
          </span>
        </Row>
        <Row label={t("sections.responses")}>
          <span className="block">
            {asks.length ? asks.join(" · ") : t("hub.view.none")}
          </span>
          <span className="block text-slate-600">
            {post.allowComments
              ? t("hub.view.comments")
              : t("hub.view.commentsOff")}
          </span>
          {post.deadline ? (
            <span className="block text-slate-600">
              {t("hub.results.deadline", {
                time: formatDateTime(post.deadline, locale),
              })}
            </span>
          ) : null}
        </Row>
        {hub.attachments.length ? (
          <Row label={t("sections.attachments")}>
            {hub.attachments.map((a) => a.fileName).join("、")}
          </Row>
        ) : null}
      </Rows>
      {coverUrl ? (
        // biome-ignore lint/performance/noImgElement: signed private URL
        <img
          src={coverUrl}
          alt={t("fields.currentCover")}
          className="max-h-48 rounded-lg border border-slate-200 object-cover"
        />
      ) : null}
      <Bodies ja={post.bodyJa} en={post.bodyEn} />
    </Card>
  );
}

/** 受付中 / 締め切り status with a close or reopen button (admins). */
export async function CloseControl({
  kind,
  id,
  closedAt,
  deadline,
  action,
  locale,
}: {
  kind: "event" | "news";
  id: string;
  closedAt: Date | null;
  /** effective deadline (null = none) */
  deadline: Date | null;
  action: (fd: FormData) => Promise<void>;
  locale: "ja" | "en";
}) {
  const t = await getTranslations("adminContent");
  const k = kind === "event" ? "events.rsvp" : "hub.close";
  const past = !closedAt && deadline !== null && deadline <= new Date();
  const status = closedAt
    ? t(`${k}.closedManual`, { time: formatDateTime(closedAt, locale) })
    : past
      ? t(`${k}.closedDeadline`)
      : deadline
        ? t(`${k}.open`, { time: formatDateTime(deadline, locale) })
        : t(
            kind === "event" ? "events.rsvp.open" : "hub.close.openNoDeadline",
            {
              time: "",
            },
          );
  return (
    <section
      aria-label={t(`${k}.title`)}
      className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <h2 className="font-semibold">{t(`${k}.title`)}</h2>
      <p className="text-sm">{status}</p>
      {past ? null : (
        <form action={action}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="close" value={closedAt ? "0" : "1"} />
          <SubmitButton variant={closedAt ? "secondary" : "danger"}>
            {closedAt ? t(`${k}.reopen`) : t(`${k}.close`)}
          </SubmitButton>
        </form>
      )}
      <p className="text-xs text-slate-500">{t(`${k}.hint`)}</p>
    </section>
  );
}
