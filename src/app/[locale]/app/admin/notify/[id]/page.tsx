import { CheckCheck, Eye, EyeOff } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { formatCompactDate, formatTime } from "@/components/admin/admin-format";
import {
  ReadMeter,
  ReceiptList,
  readPercent,
} from "@/components/admin/read-receipts";
import { AdminSection } from "@/components/admin/section-nav";
import { broadcastAudienceText } from "@/components/broadcast/audience-text";
import { ManageMessage } from "@/components/broadcast/manage-message";
import { BackLink } from "@/components/ui/back-link";
import { Alert, Card, PageHeader } from "@/components/ui/card";
import { messageReceipts } from "@/lib/announcements";
import { loadCohortOptions } from "@/lib/cohorts-db";
import { db } from "@/lib/db";
import { asLocale } from "@/lib/events";
import { displayName, formatDateTime } from "@/lib/format";
import { requireActive } from "@/lib/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/admin/notify/[id]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "broadcast" });
  return { title: t("detail.pageTitle") };
}

/** A sent message and who has read it: its sender or an admin only. */
export default async function SentMessagePage({
  params,
}: PageProps<"/[locale]/app/admin/notify/[id]">) {
  const { id, locale: rawLocale } = await params;
  const locale = asLocale(rawLocale);
  const me = await requireActive();
  if (!id || id.length > 64) notFound();
  const b = await db.broadcast.findUnique({
    where: { id },
    include: { sender: { select: { nameRomaji: true, nameKanji: true } } },
  });
  if (!b || (b.senderId !== me.id && !me.isAdmin)) notFound();

  const [t, tr, receipts, cohorts] = await Promise.all([
    getTranslations("broadcast"),
    getTranslations("roles"),
    messageReceipts(b.id),
    b.cohortId ? loadCohortOptions(locale) : Promise.resolve([]),
  ]);
  const read = receipts.read.length;
  const total = read + receipts.unread.length;
  const audience = broadcastAudienceText(b, {
    cohort: (cid) => cohorts.find((c) => c.id === cid)?.label,
    audience: (a) => tr(`audience.${a}`),
    all: t("audience.ALL"),
  });
  const sender = b.position
    ? t("fromPosition", {
        name: displayName(b.sender, locale),
        position: t(`positions.${b.position}`),
      })
    : displayName(b.sender, locale);
  const more = (n: number) => t("receipts.showAll", { count: n - 20 });

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/app/admin/notify">{t("detail.back")}</BackLink>
        <PageHeader title={<span className="break-words">{b.title}</span>} />
        <dl className="-mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-slate-500">{t("detail.sentAt")}</dt>
          <dd className="text-slate-800">
            <time dateTime={b.createdAt.toISOString()}>
              {formatDateTime(b.createdAt, locale)}
            </time>
          </dd>
          <dt className="mt-1 text-slate-500 sm:mt-0">
            {t("detail.audience")}
          </dt>
          <dd className="text-slate-800">{audience}</dd>
          <dt className="mt-1 text-slate-500 sm:mt-0">{t("detail.from")}</dt>
          <dd className="text-slate-800">{sender}</dd>
        </dl>
      </div>

      <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6 lg:space-y-0">
        <section
          aria-labelledby="message-body"
          className="min-w-0 lg:col-start-1 lg:row-start-1"
        >
          <Card>
            <h2 id="message-body" className="mb-3 text-lg font-semibold">
              {t("detail.body")}
            </h2>
            <p className="text-sm leading-relaxed break-words whitespace-pre-line text-slate-800">
              {b.body}
            </p>
          </Card>
          <div className="mt-6">
            <ManageMessage
              id={b.id}
              title={b.title}
              body={b.body}
              archived={b.archivedAt !== null}
              edited={b.editedAt !== null}
            />
          </div>
        </section>

        <AdminSection
          id="receipts"
          title={t("receipts.title")}
          icon={<CheckCheck />}
          className="lg:col-start-2 lg:row-start-1"
        >
          {total === 0 ? (
            <Alert tone="info">{t("receipts.legacy")}</Alert>
          ) : (
            <div className="space-y-6">
              <ReadMeter
                size="lg"
                read={read}
                total={total}
                label={t("receipts.readOf", { read, total })}
                percentLabel={t("receipts.percent", {
                  percent: readPercent(read, total),
                })}
              />
              <section aria-labelledby="receipts-read">
                <div className="mb-1 flex items-center gap-2">
                  <h3
                    id="receipts-read"
                    className="flex items-center gap-2 text-sm font-semibold text-slate-800"
                  >
                    <Eye aria-hidden="true" className="size-4 text-brand-700" />
                    {t("receipts.read")}
                  </h3>
                  <CountPill>{read}</CountPill>
                </div>
                <ReceiptList
                  empty={t("receipts.noneRead")}
                  moreLabel={more(read)}
                  items={receipts.read.map((r) => ({
                    key: r.user.id,
                    name: displayName(r.user, locale),
                    time: r.readAt
                      ? {
                          iso: r.readAt.toISOString(),
                          label: `${formatCompactDate(r.readAt, locale)} ${formatTime(r.readAt, locale)}`,
                        }
                      : undefined,
                  }))}
                />
              </section>
              <section aria-labelledby="receipts-unread">
                <div className="mb-1 flex items-center gap-2">
                  <h3
                    id="receipts-unread"
                    className="flex items-center gap-2 text-sm font-semibold text-slate-800"
                  >
                    <EyeOff
                      aria-hidden="true"
                      className="size-4 text-slate-500"
                    />
                    {t("receipts.unread")}
                  </h3>
                  <CountPill>{receipts.unread.length}</CountPill>
                </div>
                <ReceiptList
                  empty={t("receipts.allRead")}
                  moreLabel={more(receipts.unread.length)}
                  items={receipts.unread.map((r) => ({
                    key: r.user.id,
                    name: displayName(r.user, locale),
                  }))}
                />
              </section>
            </div>
          )}
        </AdminSection>
      </div>
    </div>
  );
}

function CountPill({ children }: { children: number }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 tabular-nums">
      {children}
    </span>
  );
}
