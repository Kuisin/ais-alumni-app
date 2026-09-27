import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { chatMessagesAction, chatReadStateAction } from "@/app/actions/chat";
import { ChatRoom } from "@/components/chat/chat-room";
import { ChatGroupKind, PositionKey, RoleKey } from "@/generated/prisma/enums";
import { AVATAR_SELECT, loadConnections, photoFor } from "@/lib/avatar";
import { GROUP_SELECT } from "@/lib/chat-db";
import { chatGroupName } from "@/lib/chat-labels";
import { db } from "@/lib/db";
import { asLocale } from "@/lib/events";
import { channelTopic } from "@/lib/realtime";
import { getCurrentUser, requireActive } from "@/lib/session";

/** The talk visible to the viewer: a member, or an admin (groups only). */
async function loadGroup(id: string, viewer: { id: string; isAdmin: boolean }) {
  if (id.length > 64) return null;
  const [group, me] = await Promise.all([
    db.chatGroup.findUnique({
      where: { id },
      select: {
        ...GROUP_SELECT,
        members: {
          orderBy: { user: { nameRomaji: "asc" } },
          // Everyone in the group, for the member list and @mentions (a
          // whole year group of graduates can pass 500).
          take: 2000,
          select: {
            user: {
              select: {
                nameRomaji: true,
                nameKanji: true,
                ...AVATAR_SELECT,
                roles: {
                  where: {
                    role: {
                      in: [RoleKey.CURRENT_STUDENT, RoleKey.FORMER_STUDENT],
                    },
                    cohortId: { not: null },
                  },
                  select: { cohort: { select: { number: true } } },
                  take: 1,
                },
                positions: {
                  where: { position: PositionKey.STUDENT_LEADER },
                  select: { id: true },
                },
              },
            },
          },
        },
        _count: { select: { members: true } },
      },
    }),
    db.chatMember.findUnique({
      where: { groupId_userId: { groupId: id, userId: viewer.id } },
      select: { lastReadAt: true, muted: true },
    }),
  ]);
  if (!group) return null;
  const direct = group.kind === ChatGroupKind.DIRECT;
  // Nobody but the two people may open a 1:1 talk.
  if (!me && (direct || !viewer.isAdmin)) return null;
  return { group, me, direct };
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/chat/[id]">) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "chat" });
  const user = await getCurrentUser();
  const found = user ? await loadGroup(id, user) : null;
  if (!found || !user) return { title: t("title") };
  const other = found.group.members.find((m) => m.user.id !== user.id)?.user;
  return {
    title: found.direct
      ? (other?.nameRomaji ?? other?.nameKanji ?? t("title"))
      : chatGroupName(t, found.group, asLocale(locale)),
  };
}

export default async function ChatRoomPage({
  params,
}: PageProps<"/[locale]/app/chat/[id]">) {
  const { id, locale: raw } = await params;
  const locale = asLocale(raw);
  const user = await requireActive();
  const found = await loadGroup(id, user);
  if (!found) notFound();
  const { group, me, direct } = found;
  const t = await getTranslations("chat");
  const [messages, reads] = await Promise.all([
    chatMessagesAction(id, {}),
    chatReadStateAction(id),
  ]);
  const conn = await loadConnections(user.id);
  const members = group.members.map(({ user: u }) => ({
    id: u.id,
    name: u.nameRomaji ?? u.nameKanji ?? "—",
    avatar: photoFor(conn, u),
    cohort: u.roles[0]?.cohort?.number ?? null,
    rep: u.positions.length > 0,
  }));
  const other = members.find((m) => m.id !== user.id);
  // A 1:1 talk stops when either side has blocked the other.
  const blocked =
    direct && other
      ? (await db.block.count({
          where: {
            OR: [
              { blockerId: user.id, blockedId: other.id },
              { blockerId: other.id, blockedId: user.id },
            ],
          },
        })) > 0
      : direct;

  return (
    <ChatRoom
      groupId={group.id}
      topic={channelTopic("chat", group.id)}
      me={user.id}
      isAdmin={user.isAdmin}
      member={Boolean(me)}
      direct={direct}
      title={direct ? (other?.name ?? "—") : chatGroupName(t, group, locale)}
      members={members}
      memberCount={group._count.members}
      initial={messages ?? []}
      initialReads={reads ?? []}
      lastReadAt={me?.lastReadAt.toISOString() ?? null}
      muted={me?.muted ?? false}
      blocked={blocked}
    />
  );
}
