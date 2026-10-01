import { isReactionEmoji } from "@/lib/chat-emoji";
import { db } from "@/lib/db";
import { displayName } from "@/lib/format";

/**
 * Emoji reactions on chat messages (any emoji), as in the app
 * (Kuisin/ais-alumni-v2: src/server/lib/mobile/chat-reactions.ts — same
 * table, same rules). Who may react is checked by the callers
 * (src/app/actions/chat.ts): whoever can open the talk, except in a stopped
 * 1:1 talk. No notifications: other open rooms get a "reaction" signal and
 * reload that message's reactions.
 *
 * The ChatReaction table comes with a migration; on a database without it,
 * reading answers "no reactions" and toggling `unavailable`, so chat itself
 * keeps working.
 */

export type ChatReactionView = {
  /** one emoji (a single grapheme cluster) */
  emoji: string;
  count: number;
  /** the member reacted with it (again to remove) */
  mine: boolean;
  /** who reacted (up to 10, earliest first) */
  names: string[];
};

/** Different emoji one message can carry. */
export const MAX_REACTION_EMOJI = 20;
/** Names listed per emoji. */
const MAX_NAMES = 10;

/**
 * The table isn't there yet: Prisma's P2021, or Postgres' 42P01 / "relation
 * … does not exist" through the driver adapter.
 */
function missingTable(e: unknown): boolean {
  const err = e as { code?: unknown; message?: unknown; cause?: unknown };
  if (err?.code === "P2021" || err?.code === "42P01") return true;
  const text = `${String(err?.message ?? "")} ${String(
    (err?.cause as { message?: unknown } | undefined)?.message ?? "",
  )}`;
  return /ChatReaction/i.test(text) && /does not exist/i.test(text);
}

type Row = {
  messageId: string;
  userId: string;
  emoji: string;
  user: { nameRomaji: string | null; nameKanji: string | null };
};

/** Counts per emoji, by each emoji's first reaction. Pure. */
export function summarizeReactions(
  rows: readonly Row[],
  meId: string,
): Map<string, ChatReactionView[]> {
  const out = new Map<string, Map<string, ChatReactionView>>();
  for (const r of rows) {
    const byEmoji = out.get(r.messageId) ?? new Map();
    out.set(r.messageId, byEmoji);
    let s = byEmoji.get(r.emoji);
    if (!s) {
      s = { emoji: r.emoji, count: 0, mine: false, names: [] };
      byEmoji.set(r.emoji, s);
    }
    s.count++;
    if (r.userId === meId) s.mine = true;
    if (s.names.length < MAX_NAMES) s.names.push(displayName(r.user));
  }
  // Maps keep insertion order: by each emoji's first reaction.
  return new Map([...out].map(([id, m]) => [id, [...m.values()]]));
}

/** The reactions of these messages, by message id — one query. */
export async function reactionsByMessage(
  messageIds: string[],
  meId: string,
): Promise<Map<string, ChatReactionView[]>> {
  if (!messageIds.length) return new Map();
  try {
    const rows = await db.chatReaction.findMany({
      where: { messageId: { in: messageIds } },
      orderBy: { createdAt: "asc" },
      select: {
        messageId: true,
        userId: true,
        emoji: true,
        user: { select: { nameRomaji: true, nameKanji: true } },
      },
    });
    return summarizeReactions(rows, meId);
  } catch (e) {
    if (missingTable(e)) return new Map();
    throw e;
  }
}

export type ToggleReactionError =
  | "invalid"
  | "too_many"
  | "forbidden"
  | "unavailable";

/**
 * Add or remove the member's reaction with that emoji on a message of this
 * talk (not a deleted one). At most MAX_REACTION_EMOJI different emoji per
 * message.
 */
export async function toggleReaction(
  groupId: string,
  messageId: string,
  userId: string,
  raw: string,
): Promise<{ ok: true } | { ok: false; error: ToggleReactionError }> {
  const emoji = String(raw ?? "").trim();
  if (!isReactionEmoji(emoji)) return { ok: false, error: "invalid" };
  const m = await db.chatMessage.findUnique({
    where: { id: messageId },
    select: { groupId: true, deletedAt: true },
  });
  if (!m || m.groupId !== groupId || m.deletedAt)
    return { ok: false, error: "forbidden" };

  const key = { messageId, userId, emoji };
  try {
    const had = await db.chatReaction.findUnique({
      where: { messageId_userId_emoji: key },
      select: { emoji: true },
    });
    if (had) await db.chatReaction.deleteMany({ where: key });
    else {
      const used = await db.chatReaction.findMany({
        where: { messageId },
        distinct: ["emoji"],
        select: { emoji: true },
      });
      if (
        !used.some((u) => u.emoji === emoji) &&
        used.length >= MAX_REACTION_EMOJI
      )
        return { ok: false, error: "too_many" };
      // A double click racing itself: the row is there either way.
      await db.chatReaction.createMany({ data: [key], skipDuplicates: true });
    }
  } catch (e) {
    if (missingTable(e)) return { ok: false, error: "unavailable" };
    throw e;
  }
  return { ok: true };
}
