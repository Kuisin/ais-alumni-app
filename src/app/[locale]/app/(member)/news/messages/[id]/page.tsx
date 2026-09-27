import { Calendar, UserRound, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { cache } from "react";
import { SenderLabel } from "@/components/news/message-row";
import { BackLink } from "@/components/ui/back-link";
import { Alert, Card } from "@/components/ui/card";
import { BroadcastScope } from "@/generated/prisma/enums";
import { openMessage } from "@/lib/announcements";
import { effectiveAudiences } from "@/lib/audience";
import { cohortLabel } from "@/lib/cohorts";
import { asLocale } from "@/lib/events";
import { MESSAGES_ENABLED } from "@/lib/features";
import { formatDateTime } from "@/lib/format";
import { getCurrentUser, requireActive } from "@/lib/session";

/** The message if the current user may read it (marks it read), or null. */
const loadMessage = cache(async (id: string) => {
  const user = await getCurrentUser();
  if (!user) return null;
  return openMessage(user, id);
});

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/news/messages/[id]">) {
  const { id } = await params;
  const msg = await loadMessage(id);
  if (!msg) return {};
  return { title: msg.broadcast.title };
}

export default async function MessagePage({
  params,
}: PageProps<"/[locale]/app/news/messages/[id]">) {
  if (!MESSAGES_ENABLED) notFound();
  const { id, locale: rawLocale } = await params;
  const locale = asLocale(rawLocale);
  await requireActive();
  const msg = await loadMessage(id);
  if (!msg) notFound();

  const t = await getTranslations("news");
  const tr = await getTranslations("roles");
  const b = msg.broadcast;

  let sentTo: string;
  if (b.scope === BroadcastScope.COHORT) {
    // The 学年 may have been deleted since (cohortId is set null).
    sentTo = b.cohort ? cohortLabel(b.cohort, locale) : "—";
  } else {
    const audiences = effectiveAudiences(b);
    sentTo = audiences.length
      ? audiences
          .map((a) => tr(`audience.${a}`))
          .join(locale === "ja" ? "・" : ", ")
      : t("messages.toAll");
  }

  return (
    <article className="space-y-6">
      <div>
        <BackLink href="/app/news?tab=messages">
          {t("messages.backToList")}
        </BackLink>
        <h1 className="text-2xl font-bold tracking-tight break-words">
          {b.title}
        </h1>
        <dl className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-[auto_1fr] sm:gap-x-4">
          <Meta icon={<UserRound />} label={t("messages.from")}>
            <SenderLabel sender={b.sender} position={b.position} />
          </Meta>
          <Meta icon={<Calendar />} label={t("messages.sentAt")}>
            <time dateTime={b.createdAt.toISOString()}>
              {formatDateTime(b.createdAt, locale)}
            </time>
            {b.editedAt ? (
              <span className="ml-2 text-slate-500">
                （{t("messages.edited")}）
              </span>
            ) : null}
          </Meta>
          <Meta icon={<Users />} label={t("messages.sentTo")}>
            {sentTo}
          </Meta>
        </dl>
      </div>
      {msg.isRecipient ? null : (
        <Alert tone="info">{t("messages.senderView")}</Alert>
      )}
      <Card>
        {/* Plain text: React escapes it; line breaks are kept. */}
        <div className="whitespace-pre-line break-words text-slate-800 leading-relaxed">
          {b.body}
        </div>
      </Card>
    </article>
  );
}

function Meta({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="contents">
      <dt className="inline-flex items-center gap-1.5 font-medium text-slate-500 [&_svg]:size-4 [&_svg]:shrink-0">
        <span aria-hidden="true">{icon}</span>
        {label}
      </dt>
      <dd className="min-w-0 break-words max-sm:mb-1 max-sm:pl-5.5">
        {children}
      </dd>
    </div>
  );
}
