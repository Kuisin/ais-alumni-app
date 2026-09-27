"use server";

import { z } from "zod";
import { audit } from "@/lib/audit";
import { CHAT_PAGE_SIZE, MAX_CHAT_MESSAGE } from "@/lib/chat";
import { db } from "@/lib/db";
import { broadcast, realtimePublic, realtimeToken } from "@/lib/realtime";
import { actionActive, type CurrentUser } from "@/lib/session";

export type ChatMessageView = {
  id: string;
  userId: string;
  name: string;
  body: string;
  createdAt: string;
  deleted: boolean;
};

const Id = z.string().min(1).max(64);

const MESSAGE_SELECT = {
  id: true,
  userId: true,
  body: true,
  createdAt: true,
  deletedAt: true,
  user: { select: { nameRomaji: true, nameKanji: true } },
} as const;

type MessageRow = {
  id: string;
  userId: string;
  body: string;
  createdAt: Date;
  deletedAt: Date | null;
  user: { nameRomaji: string | null; nameKanji: string | null };
};

function toView(m: MessageRow): ChatMessageView {
  return {
    id: m.id,
    userId: m.userId,
    name: m.user.nameRomaji ?? m.user.nameKanji ?? "—",
    body: m.deletedAt ? "" : m.body,
    createdAt: m.createdAt.toISOString(),
    deleted: m.deletedAt !== null,
  };
}

/** Members of the group (and admins, to moderate) may open it. */
async function openGroup(groupId: unknown) {
  const user = await actionActive().catch(() => null);
  const id = Id.safeParse(groupId);
  if (!user || !id.success) return null;
  const member = await db.chatMember.findUnique({
    where: { groupId_userId: { groupId: id.data, userId: user.id } },
    select: { groupId: true },
  });
  if (!member && !user.isAdmin) return null;
  return { user, groupId: id.data, member: Boolean(member) };
}

/** Realtime connection details for the signed-in member, or null (polling). */
export async function realtimeSessionAction(): Promise<{
  url: string;
  key: string;
  token: string;
  userId: string;
} | null> {
  const pub = realtimePublic();
  const user: CurrentUser | null = await actionActive().catch(() => null);
  if (!pub || !user) return null;
  return { ...pub, token: realtimeToken(user.id), userId: user.id };
}

export type SendResult =
  | { ok: true; message: ChatMessageView }
  | { ok: false; error: "forbidden" | "invalid" | "tooFast" };

export async function sendChatMessageAction(
  groupId: string,
  body: string,
): Promise<SendResult> {
  const g = await openGroup(groupId);
  if (!g?.member) return { ok: false, error: "forbidden" };
  const text = String(body ?? "").trim();
  if (!text || text.length > MAX_CHAT_MESSAGE)
    return { ok: false, error: "invalid" };
  const recent = await db.chatMessage.count({
    where: {
      userId: g.user.id,
      createdAt: { gt: new Date(Date.now() - 60_000) },
    },
  });
  if (recent >= 20) return { ok: false, error: "tooFast" };
  const row = await db.chatMessage.create({
    data: { groupId: g.groupId, userId: g.user.id, body: text },
    select: MESSAGE_SELECT,
  });
  await db.chatMember.update({
    where: { groupId_userId: { groupId: g.groupId, userId: g.user.id } },
    data: { lastReadAt: row.createdAt },
  });
  const message = toView(row);
  await broadcast([
    { topic: `chat:${g.groupId}`, event: "message", payload: message },
  ]);
  return { ok: true, message };
}

/** Older messages (before) or new ones (after; the polling fallback). */
export async function chatMessagesAction(
  groupId: string,
  opts: { before?: string; after?: string },
): Promise<ChatMessageView[] | null> {
  const g = await openGroup(groupId);
  if (!g) return null;
  const before = opts.before ? new Date(opts.before) : null;
  const after = opts.after ? new Date(opts.after) : null;
  if (after) {
    const rows = await db.chatMessage.findMany({
      where: { groupId: g.groupId, createdAt: { gt: after } },
      orderBy: { createdAt: "asc" },
      take: 200,
      select: MESSAGE_SELECT,
    });
    return rows.map(toView);
  }
  const rows = await db.chatMessage.findMany({
    where: {
      groupId: g.groupId,
      ...(before ? { createdAt: { lt: before } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: CHAT_PAGE_SIZE,
    select: MESSAGE_SELECT,
  });
  return rows.reverse().map(toView);
}

/** The member has seen everything up to now. */
export async function markChatReadAction(groupId: string): Promise<void> {
  const g = await openGroup(groupId);
  if (!g?.member) return;
  await db.chatMember.update({
    where: { groupId_userId: { groupId: g.groupId, userId: g.user.id } },
    data: { lastReadAt: new Date() },
  });
}

/** Authors delete their own messages; admins may delete any (moderation). */
export async function deleteChatMessageAction(
  messageId: string,
): Promise<{ ok: boolean }> {
  const user = await actionActive().catch(() => null);
  const id = Id.safeParse(messageId);
  if (!user || !id.success) return { ok: false };
  const m = await db.chatMessage.findUnique({
    where: { id: id.data },
    select: { groupId: true, userId: true, body: true, deletedAt: true },
  });
  if (!m || m.deletedAt || (m.userId !== user.id && !user.isAdmin))
    return { ok: false };
  await db.chatMessage.update({
    where: { id: id.data },
    data: { deletedAt: new Date(), deletedById: user.id, body: "" },
  });
  if (m.userId !== user.id)
    await audit(
      user.id,
      "chat.message_delete",
      { type: "ChatMessage", id: id.data },
      { groupId: m.groupId, author: m.userId, body: m.body.slice(0, 200) },
    );
  await broadcast([
    {
      topic: `chat:${m.groupId}`,
      event: "delete",
      payload: { id: id.data },
    },
  ]);
  return { ok: true };
}

/** Turn the daily digest for a group off (or on again). */
export async function setChatMutedAction(
  groupId: string,
  muted: boolean,
): Promise<{ ok: boolean }> {
  const g = await openGroup(groupId);
  if (!g?.member) return { ok: false };
  await db.chatMember.update({
    where: { groupId_userId: { groupId: g.groupId, userId: g.user.id } },
    data: { muted: Boolean(muted) },
  });
  return { ok: true };
}
