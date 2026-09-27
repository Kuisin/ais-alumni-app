import { ChevronRight, MessagesSquare } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { KIND_ORDER } from "@/lib/chat";
import {
  chatUnreadByGroup,
  GROUP_SELECT,
  syncChatMembership,
} from "@/lib/chat-db";
import { chatGroupName } from "@/lib/chat-labels";
import { db } from "@/lib/db";
import { asLocale } from "@/lib/events";
import { requireActive } from "@/lib/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/chat">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "chat" });
  return { title: t("title") };
}

const time = (d: Date, locale: "ja" | "en") => {
  const today =
    new Date(d.getTime() + 9 * 3600_000).toISOString().slice(0, 10) ===
    new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
    timeZone: "Asia/Tokyo",
    ...(today
      ? { hour: "2-digit", minute: "2-digit" }
      : { month: "short", day: "numeric" }),
  }).format(d);
};

/** The member's group chats (joined automatically), newest activity first. */
export default async function ChatListPage({
  params,
}: PageProps<"/[locale]/app/chat">) {
  const locale = asLocale((await params).locale);
  const user = await requireActive();
  await syncChatMembership(user.id);
  const t = await getTranslations("chat");

  const mine = await db.chatMember.findMany({
    where: { userId: user.id },
    select: { groupId: true },
  });
  const myIds = mine.map((m) => m.groupId);
  const groups = await db.chatGroup.findMany({
    where: user.isAdmin ? {} : { id: { in: myIds } },
    select: {
      ...GROUP_SELECT,
      _count: { select: { members: true } },
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          body: true,
          createdAt: true,
          user: { select: { nameRomaji: true, nameKanji: true } },
        },
      },
    },
  });
  const unread = await chatUnreadByGroup(user.id);
  const sorted = [...groups].sort((a, b) => {
    const la = a.messages[0]?.createdAt.getTime() ?? 0;
    const lb = b.messages[0]?.createdAt.getTime() ?? 0;
    if (la !== lb) return lb - la;
    const k = KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind);
    return k || (a.cohort?.number ?? 0) - (b.cohort?.number ?? 0);
  });
  const joined = sorted.filter((g) => myIds.includes(g.id));
  const others = sorted.filter((g) => !myIds.includes(g.id));

  const list = (rows: typeof sorted) => (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {rows.map((g) => {
        const last = g.messages[0];
        const n = unread.get(g.id) ?? 0;
        return (
          <li key={g.id}>
            <Link
              href={`/app/chat/${g.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
            >
              <span
                aria-hidden="true"
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-800"
              >
                <MessagesSquare className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={n ? "font-bold" : "font-semibold"}>
                    {chatGroupName(t, g, locale)}
                  </span>
                  {last ? (
                    <time
                      dateTime={last.createdAt.toISOString()}
                      className="shrink-0 text-xs text-slate-500"
                    >
                      {time(last.createdAt, locale)}
                    </time>
                  ) : null}
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm text-slate-600">
                    {last
                      ? `${last.user.nameRomaji ?? last.user.nameKanji ?? ""}: ${last.body}`
                      : t("members", { count: g._count.members })}
                  </span>
                  {n ? (
                    <span className="shrink-0 rounded-full bg-red-600 px-2 text-xs leading-5 font-semibold text-white tabular-nums">
                      <span aria-hidden="true">{n > 99 ? "99+" : n}</span>
                      <span className="sr-only">
                        {t("unread", { count: n })}
                      </span>
                    </span>
                  ) : null}
                </span>
              </span>
              <ChevronRight
                aria-hidden="true"
                className="size-5 shrink-0 text-slate-400"
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      {joined.length === 0 ? (
        <EmptyState icon={<MessagesSquare />} hint={t("emptyHint")}>
          {t("empty")}
        </EmptyState>
      ) : (
        list(joined)
      )}
      {others.length ? (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">{t("allGroups")}</h2>
          {list(others)}
        </section>
      ) : null}
    </>
  );
}
