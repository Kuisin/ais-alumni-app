import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { chatMessagesAction } from "@/app/actions/chat";
import { ChatRoom } from "@/components/chat/chat-room";
import { BackLink } from "@/components/ui/back-link";
import { GROUP_SELECT } from "@/lib/chat-db";
import { chatGroupName } from "@/lib/chat-labels";
import { db } from "@/lib/db";
import { asLocale } from "@/lib/events";
import { displayName } from "@/lib/format";
import { channelTopic } from "@/lib/realtime";
import { requireActive } from "@/lib/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/chat/[id]">) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "chat" });
  const g =
    id.length <= 64
      ? await db.chatGroup.findUnique({ where: { id }, select: GROUP_SELECT })
      : null;
  return { title: g ? chatGroupName(t, g, asLocale(locale)) : t("title") };
}

export default async function ChatRoomPage({
  params,
}: PageProps<"/[locale]/app/chat/[id]">) {
  const { id, locale: raw } = await params;
  const locale = asLocale(raw);
  const user = await requireActive();
  if (id.length > 64) notFound();
  const [group, me] = await Promise.all([
    db.chatGroup.findUnique({
      where: { id },
      select: {
        ...GROUP_SELECT,
        members: {
          orderBy: { user: { nameRomaji: "asc" } },
          take: 500,
          select: {
            user: { select: { id: true, nameRomaji: true, nameKanji: true } },
          },
        },
        _count: { select: { members: true } },
      },
    }),
    db.chatMember.findUnique({
      where: { groupId_userId: { groupId: id, userId: user.id } },
      select: { lastReadAt: true, muted: true },
    }),
  ]);
  if (!group || (!me && !user.isAdmin)) notFound();
  const messages = (await chatMessagesAction(id, {})) ?? [];
  const t = await getTranslations("chat");

  return (
    <div className="space-y-4">
      <div>
        <BackLink href="/app/chat">{t("room.back")}</BackLink>
        <h1 className="text-2xl font-bold tracking-tight">
          {chatGroupName(t, group, locale)}
        </h1>
        <p className="text-sm text-slate-600">
          {t(`groupHints.${group.kind}`)}
        </p>
        <details className="mt-2 text-sm">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-brand-700">
            {t("members", { count: group._count.members })}
          </summary>
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-slate-700">
            {group.members.map((m) => (
              <li key={m.user.id}>{displayName(m.user, locale)}</li>
            ))}
          </ul>
        </details>
      </div>
      <ChatRoom
        groupId={group.id}
        topic={channelTopic("chat", group.id)}
        me={user.id}
        isAdmin={user.isAdmin}
        member={Boolean(me)}
        initial={messages}
        lastReadAt={me?.lastReadAt.toISOString() ?? null}
        muted={me?.muted ?? false}
      />
    </div>
  );
}
