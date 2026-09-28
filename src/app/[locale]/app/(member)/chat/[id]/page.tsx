import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { chatMessagesAction, chatReadStateAction } from "@/app/actions/chat";
import { ChatRoom } from "@/components/chat/chat-room";
import { loadConnections, photoFor } from "@/lib/avatar";
import { directStopReason } from "@/lib/chat-db";
import { chatGroupName } from "@/lib/chat-labels";
import { loadChatGroup } from "@/lib/chat-room";
import { asLocale } from "@/lib/events";
import { channelTopic } from "@/lib/realtime";
import { getCurrentUser, requireActive } from "@/lib/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/chat/[id]">) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "chat" });
  const user = await getCurrentUser();
  const found = user ? await loadChatGroup(id, user) : null;
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
  const found = await loadChatGroup(id, user);
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
  // A 1:1 talk stops when either side has blocked the other or their
  // member types no longer allow it.
  const stopped = direct
    ? other
      ? await directStopReason(user.id, other.id)
      : "blocked"
    : null;

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
      stopped={stopped}
    />
  );
}
