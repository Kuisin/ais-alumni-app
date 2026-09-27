import { getTranslations } from "next-intl/server";
import { ChatList, type ChatListRow } from "@/components/chat/chat-list";
import { ChatGroupKind } from "@/generated/prisma/enums";
import { AVATAR_SELECT, loadConnections, photoFor } from "@/lib/avatar";
import { KIND_ORDER } from "@/lib/chat";
import {
  chatMentionedGroups,
  chatUnreadByGroup,
  GROUP_SELECT,
  syncChatMembership,
} from "@/lib/chat-db";
import { chatGroupName } from "@/lib/chat-labels";
import { db } from "@/lib/db";
import { asLocale } from "@/lib/events";
import { DIRECT_CHAT_ENABLED } from "@/lib/features";
import { requireActive } from "@/lib/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/chat">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "chat" });
  return { title: t("title") };
}

/** Talks (1:1) and group chats, newest activity first — like LINE. */
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
    // Admins also see (and can moderate) every group chat, never others' 1:1s.
    where: user.isAdmin
      ? { OR: [{ id: { in: myIds } }, { kind: { not: ChatGroupKind.DIRECT } }] }
      : { id: { in: myIds } },
    select: {
      ...GROUP_SELECT,
      _count: { select: { members: true } },
      members: {
        where: { userId: { not: user.id } },
        take: 1,
        select: {
          user: {
            select: { nameRomaji: true, nameKanji: true, ...AVATAR_SELECT },
          },
        },
      },
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          body: true,
          createdAt: true,
          userId: true,
          user: { select: { nameRomaji: true, nameKanji: true } },
        },
      },
    },
  });
  const [unread, mentioned, conn] = await Promise.all([
    chatUnreadByGroup(user.id),
    chatMentionedGroups(user.id),
    loadConnections(user.id),
  ]);

  const rows: ChatListRow[] = groups
    // A 1:1 talk shows once someone has written.
    .filter((g) => g.kind !== ChatGroupKind.DIRECT || g.messages.length > 0)
    .map((g) => {
      const direct = g.kind === ChatGroupKind.DIRECT;
      const other = g.members[0]?.user;
      const last = g.messages[0];
      const who = last
        ? last.userId === user.id
          ? t("you")
          : (last.user.nameRomaji ?? last.user.nameKanji ?? "")
        : "";
      return {
        id: g.id,
        direct,
        joined: myIds.includes(g.id),
        name: direct
          ? (other?.nameRomaji ?? other?.nameKanji ?? "—")
          : chatGroupName(t, g, locale),
        avatar: direct && other ? photoFor(conn, other) : null,
        memberCount: g._count.members,
        preview: last
          ? direct && last.userId !== user.id
            ? last.body
            : `${who}: ${last.body}`
          : t("members", { count: g._count.members }),
        lastAt: last?.createdAt.toISOString() ?? null,
        unread: unread.get(g.id) ?? 0,
        mentioned: mentioned.has(g.id),
        order: KIND_ORDER.indexOf(g.kind) * 1000 + (g.cohort?.number ?? 0),
      };
    })
    .sort((a, b) =>
      a.lastAt !== b.lastAt
        ? (b.lastAt ?? "").localeCompare(a.lastAt ?? "")
        : a.order - b.order,
    );

  return <ChatList rows={rows} canStartDirect={DIRECT_CHAT_ENABLED} />;
}
