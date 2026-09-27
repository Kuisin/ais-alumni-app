import type { Prisma } from "@/generated/prisma/client";
import { AccountState, RoleKey } from "@/generated/prisma/enums";
import { getTranslatorFor } from "@/i18n/translator";
import { desiredGroups } from "@/lib/chat";
import { db } from "@/lib/db";
import { NOTIFY_USER_SELECT, notifyMany } from "@/lib/notify";
import { publicUrl } from "@/lib/urls";

type Client = Prisma.TransactionClient | typeof db;

const STUDENT = [RoleKey.CURRENT_STUDENT, RoleKey.FORMER_STUDENT];

/**
 * Put the member in (and take them out of) the groups for their type and
 * 学年. Only ACTIVE members are in groups. New members start with nothing
 * unread. Returns true if anything changed.
 */
export async function syncChatMembership(
  userId: string,
  client: Client = db,
): Promise<boolean> {
  const user = await client.user.findUnique({
    where: { id: userId },
    select: {
      state: true,
      roles: { select: { role: true, cohortId: true } },
      parentLinks: {
        select: {
          childCohortId: true,
          child: {
            select: {
              roles: {
                where: { role: { in: STUDENT }, cohortId: { not: null } },
                select: { cohortId: true },
              },
            },
          },
        },
      },
    },
  });
  const current = await client.chatMember.findMany({
    where: { userId },
    select: { groupId: true, group: { select: { key: true } } },
  });
  if (!user || user.state !== AccountState.ACTIVE) {
    if (!current.length) return false;
    await client.chatMember.deleteMany({ where: { userId } });
    return true;
  }
  const childCohorts = new Set<string>();
  for (const l of user.parentLinks) {
    const own = l.child?.roles[0]?.cohortId;
    if (own) childCohorts.add(own);
    else if (l.childCohortId) childCohorts.add(l.childCohortId);
  }
  const want = desiredGroups(user.roles, [...childCohorts]);
  const have = new Map(current.map((m) => [m.group.key, m.groupId]));
  let changed = false;

  for (const g of want) {
    if (have.has(g.key)) continue;
    const group = await client.chatGroup.upsert({
      where: { key: g.key },
      create: g,
      update: {},
      select: { id: true },
    });
    await client.chatMember.upsert({
      where: { groupId_userId: { groupId: group.id, userId } },
      create: { groupId: group.id, userId },
      update: {},
    });
    changed = true;
  }
  const keep = new Set(want.map((g) => g.key));
  const leave = current.filter((m) => !keep.has(m.group.key));
  if (leave.length) {
    await client.chatMember.deleteMany({
      where: { userId, groupId: { in: leave.map((m) => m.groupId) } },
    });
    changed = true;
  }
  return changed;
}

/** Daily: every member's groups (roles change with the school year). */
export async function syncAllChatMemberships(): Promise<number> {
  const users = await db.user.findMany({
    where: {
      OR: [{ state: AccountState.ACTIVE }, { chatMembers: { some: {} } }],
    },
    select: { id: true },
  });
  let changed = 0;
  for (const u of users) if (await syncChatMembership(u.id)) changed++;
  return changed;
}

/** Unread messages (not the member's own) across their groups. */
export async function chatUnreadTotal(userId: string): Promise<number> {
  const rows = await db.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n
    FROM "ChatMessage" m
    JOIN "ChatMember" cm ON cm."groupId" = m."groupId" AND cm."userId" = ${userId}
    WHERE m."createdAt" > cm."lastReadAt"
      AND m."userId" <> ${userId}
      AND m."deletedAt" IS NULL`;
  return Number(rows[0]?.n ?? 0);
}

/** Unread count per group for the member. */
export async function chatUnreadByGroup(
  userId: string,
): Promise<Map<string, number>> {
  const rows = await db.$queryRaw<{ groupId: string; n: bigint }[]>`
    SELECT m."groupId", count(*) AS n
    FROM "ChatMessage" m
    JOIN "ChatMember" cm ON cm."groupId" = m."groupId" AND cm."userId" = ${userId}
    WHERE m."createdAt" > cm."lastReadAt"
      AND m."userId" <> ${userId}
      AND m."deletedAt" IS NULL
    GROUP BY m."groupId"`;
  return new Map(rows.map((r) => [r.groupId, Number(r.n)]));
}

export const GROUP_SELECT = {
  id: true,
  kind: true,
  cohort: { select: { number: true, elementaryEndYear: true } },
} as const;

/**
 * Daily digest: one LINE/email per member with unread messages from the
 * last day in groups they haven't muted. No content, only a count + link.
 */
export async function sendChatDigest(
  now: Date = new Date(),
): Promise<{ recipients: number }> {
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const rows = await db.$queryRaw<{ userId: string; n: bigint }[]>`
    SELECT cm."userId", count(*) AS n
    FROM "ChatMessage" m
    JOIN "ChatMember" cm ON cm."groupId" = m."groupId"
    JOIN "User" u ON u.id = cm."userId"
    WHERE m."createdAt" > cm."lastReadAt"
      AND m."createdAt" > ${since}
      AND m."userId" <> cm."userId"
      AND m."deletedAt" IS NULL
      AND NOT cm.muted
      AND u.state = 'ACTIVE'
    GROUP BY cm."userId"`;
  if (rows.length === 0) return { recipients: 0 };
  const counts = new Map(rows.map((r) => [r.userId, Number(r.n)]));
  const users = await db.user.findMany({
    where: { id: { in: [...counts.keys()] } },
    select: NOTIFY_USER_SELECT,
  });
  const day = new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
  // One notification call per count, so each member sees their own number.
  const byCount = new Map<number, typeof users>();
  for (const u of users) {
    const n = counts.get(u.id) ?? 0;
    byCount.set(n, [...(byCount.get(n) ?? []), u]);
  }
  for (const [count, group] of byCount) {
    await notifyMany(group, {
      kind: "CHAT_DIGEST",
      refId: day,
      dedupe: true,
      render: async (locale) => {
        const t = await getTranslatorFor(locale, "chat");
        return {
          subject: t("digest.subject"),
          text: t("digest.text", { count }),
          url: publicUrl(`/${locale}/app/chat`),
        };
      },
    });
  }
  return { recipients: users.length };
}
