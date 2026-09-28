import { Flag, MessagesSquare, UserRound } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { setChatReportClosedAction } from "@/app/actions/chat-reports";
import { DirectRulesForm } from "@/components/chat/direct-rules-form";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { Tabs } from "@/components/ui/tabs";
import { ChatGroupKind } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import { GROUP_SELECT, loadDirectRules } from "@/lib/chat-db";
import { chatGroupName } from "@/lib/chat-labels";
import type { ChatReportMessage } from "@/lib/chat-report";
import { db } from "@/lib/db";
import { asLocale } from "@/lib/events";
import { displayName, formatDateTime } from "@/lib/format";
import { supportRef } from "@/lib/support";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/admin/chat">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "chat.admin" });
  return { title: t("title") };
}

const NAME = { id: true, nameRomaji: true, nameKanji: true } as const;

/**
 * Chat moderation: who each member type may have 1:1 talks with, and the
 * reports members sent from a chat's details (open first).
 */
export default async function AdminChatPage({
  params,
  searchParams,
}: PageProps<"/[locale]/app/admin/chat">) {
  const locale = asLocale((await params).locale);
  const tab = (await searchParams).tab === "closed" ? "closed" : "open";
  const t = await getTranslations("chat.admin");
  const tc = await getTranslations("chat");
  const where =
    tab === "open" ? { closedAt: null } : { closedAt: { not: null } };
  const [rules, rows, openCount, closedCount] = await Promise.all([
    loadDirectRules(),
    db.chatReport.findMany({
      where,
      orderBy: { createdAt: tab === "open" ? "asc" : "desc" },
      take: 200,
      include: {
        reporter: { select: NAME },
        reportedUser: { select: NAME },
        group: { select: GROUP_SELECT },
      },
    }),
    db.chatReport.count({ where: { closedAt: null } }),
    db.chatReport.count({ where: { closedAt: { not: null } } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("intro")} />
      <section aria-labelledby="direct-rules" className="space-y-3">
        <Card className="space-y-4">
          <div>
            <h2 id="direct-rules" className="text-lg font-semibold">
              {t("rulesTitle")}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{t("rulesIntro")}</p>
          </div>
          <DirectRulesForm rules={rules} />
        </Card>
      </section>
      <section aria-labelledby="chat-reports" className="space-y-4">
        <h2 id="chat-reports" className="text-lg font-semibold">
          {t("reportsTitle")}
        </h2>
        <Tabs
          label={t("reportsTitle")}
          items={[
            {
              href: "/app/admin/chat",
              label: t("open"),
              count: openCount,
              active: tab === "open",
            },
            {
              href: "/app/admin/chat?tab=closed",
              label: t("closed"),
              count: closedCount,
              active: tab === "closed",
            },
          ]}
        />
        <div data-results>
          {rows.length === 0 ? (
            <EmptyState icon={<Flag />}>
              {tab === "open" ? t("emptyOpen") : t("emptyClosed")}
            </EmptyState>
          ) : (
            <ul className="space-y-4">
              {rows.map((r) => {
                const messages = (r.messages ?? []) as ChatReportMessage[];
                const direct = r.group?.kind === ChatGroupKind.DIRECT;
                return (
                  <li key={r.id} id={r.id} className="scroll-mt-24">
                    <Card className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="red">
                          {tc(`report.reasons.${r.reason}`)}
                        </Badge>
                        <span className="ml-auto text-xs text-slate-500 tabular-nums">
                          #{supportRef(r.id)} ·{" "}
                          <time dateTime={r.createdAt.toISOString()}>
                            {formatDateTime(r.createdAt, locale)}
                          </time>
                        </span>
                      </div>
                      <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
                        <dt className="text-slate-500">{t("chat")}</dt>
                        <dd className="flex items-center gap-1">
                          <MessagesSquare
                            aria-hidden="true"
                            className="size-3.5 text-slate-500"
                          />
                          {!r.group ? (
                            t("chatGone")
                          ) : direct ? (
                            // Admins can't open 1:1 talks: the attached
                            // messages below are what they can see.
                            tc("room.direct")
                          ) : (
                            <Link
                              href={`/app/chat/${r.group.id}`}
                              className="text-brand-700 underline"
                            >
                              {chatGroupName(tc, r.group, locale)}
                            </Link>
                          )}
                        </dd>
                        <dt className="text-slate-500">{t("reporter")}</dt>
                        <dd>
                          <MemberLink user={r.reporter} locale={locale} />
                        </dd>
                        <dt className="text-slate-500">{t("reported")}</dt>
                        <dd>
                          {r.reportedUserId ? (
                            <MemberLink user={r.reportedUser} locale={locale} />
                          ) : (
                            t("wholeChat")
                          )}
                        </dd>
                        {r.closedAt ? (
                          <>
                            <dt className="text-slate-500">{t("closedAt")}</dt>
                            <dd>{formatDateTime(r.closedAt, locale)}</dd>
                          </>
                        ) : null}
                      </dl>
                      <p className="text-sm leading-relaxed break-words whitespace-pre-line text-slate-800">
                        {r.detail}
                      </p>
                      {messages.length ? (
                        <details className="rounded-lg bg-slate-50 p-3">
                          <summary className="cursor-pointer text-sm font-medium">
                            {t("messages", { count: messages.length })}
                          </summary>
                          <ol className="mt-2 space-y-2">
                            {messages.map((m) => (
                              <li key={m.id} className="text-sm">
                                <span className="font-medium">{m.name}</span>{" "}
                                <time
                                  dateTime={m.createdAt}
                                  className="text-xs text-slate-500 tabular-nums"
                                >
                                  {formatDateTime(
                                    new Date(m.createdAt),
                                    locale,
                                  )}
                                </time>
                                <p className="break-words whitespace-pre-line text-slate-800">
                                  {m.body}
                                </p>
                              </li>
                            ))}
                          </ol>
                        </details>
                      ) : null}
                      <form action={setChatReportClosedAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <input
                          type="hidden"
                          name="close"
                          value={r.closedAt ? "0" : "1"}
                        />
                        <SubmitButton variant="secondary">
                          {r.closedAt ? t("reopen") : t("close")}
                        </SubmitButton>
                      </form>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function MemberLink({
  user,
  locale,
}: {
  user: {
    id: string;
    nameRomaji: string | null;
    nameKanji: string | null;
  } | null;
  locale: "ja" | "en";
}) {
  if (!user) return <span className="text-slate-500">—</span>;
  return (
    <Link
      href={`/app/admin/members/${user.id}`}
      className="inline-flex items-center gap-1 text-brand-700 underline"
    >
      <UserRound aria-hidden="true" className="size-3.5" />
      {displayName(user, locale)}
    </Link>
  );
}
