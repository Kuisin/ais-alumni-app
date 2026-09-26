import type { Locale } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { lineMulticast, linePush } from "@/lib/line";
import { type Channel, channelsFor, type RoutableUser } from "./route";

export { chooseChannel, channelsFor } from "./route";

export type NotifyUser = RoutableUser & { id: string; locale: Locale };

export type RenderedMessage = { subject: string; text: string; url?: string };

export type Notification = {
  /** NotificationLog.kind, e.g. EVENT_REMINDER_7D, NEWS, VERIFICATION */
  kind: string;
  refId?: string;
  /** Also email even when LINE is the routed channel (§11). */
  alwaysEmail?: boolean;
  /** Skip users who already have a log row for (kind, refId). */
  dedupe?: boolean;
  render: (locale: Locale) => Promise<RenderedMessage> | RenderedMessage;
};

function lineText(m: RenderedMessage): string {
  return m.url ? `${m.subject}\n\n${m.text}\n\n${m.url}` : `${m.subject}\n\n${m.text}`;
}

async function alreadySent(userIds: string[], n: Notification): Promise<Set<string>> {
  if (!n.dedupe) return new Set();
  const rows = await db.notificationLog.findMany({
    where: { userId: { in: userIds }, kind: n.kind, refId: n.refId ?? null },
    select: { userId: true },
  });
  return new Set(rows.map((r) => r.userId));
}

/** Send one notification to one user via the routed channel(s). */
export async function notify(user: NotifyUser, n: Notification): Promise<Channel[]> {
  return (await notifyMany([user], n)).get(user.id) ?? [];
}

/**
 * Send one notification to many users. LINE recipients sharing a locale are
 * batched into multicast calls to conserve the push quota (§11).
 */
export async function notifyMany(
  users: NotifyUser[],
  n: Notification,
): Promise<Map<string, Channel[]>> {
  const skip = await alreadySent(
    users.map((u) => u.id),
    n,
  );
  const result = new Map<string, Channel[]>();
  const rendered = new Map<Locale, RenderedMessage>();
  const lineByLocale = new Map<Locale, string[]>();
  const logs: { userId: string; channel: Channel }[] = [];

  for (const u of users) {
    if (skip.has(u.id)) continue;
    if (!rendered.has(u.locale)) rendered.set(u.locale, await n.render(u.locale));
    const msg = rendered.get(u.locale) as RenderedMessage;
    const channels = channelsFor(u, { alwaysEmail: n.alwaysEmail });
    for (const ch of channels) {
      if (ch === "LINE" && u.lineUserId) {
        const list = lineByLocale.get(u.locale) ?? [];
        list.push(u.lineUserId);
        lineByLocale.set(u.locale, list);
      } else if (ch === "EMAIL" && u.primaryEmail) {
        try {
          await sendEmail({ to: u.primaryEmail, ...msg });
        } catch (e) {
          console.error(`[notify] email to ${u.id} failed`, e);
          continue;
        }
      }
      logs.push({ userId: u.id, channel: ch });
    }
    result.set(u.id, channels);
  }

  for (const [locale, ids] of lineByLocale) {
    const msg = rendered.get(locale) as RenderedMessage;
    const messages = [{ type: "text" as const, text: lineText(msg) }];
    if (ids.length === 1) await linePush(ids[0], messages);
    else await lineMulticast(ids, messages);
  }

  if (logs.length) {
    await db.notificationLog.createMany({
      data: logs.map((l) => ({
        userId: l.userId,
        channel: l.channel,
        kind: n.kind,
        refId: n.refId ?? null,
      })),
    });
  }
  return result;
}

/** Estimated LINE push count for a set of users (admin preview, §11). */
export function estimateLinePushes(users: RoutableUser[]): {
  line: number;
  email: number;
} {
  let line = 0;
  let email = 0;
  for (const u of users) {
    const ch = channelsFor(u)[0];
    if (ch === "LINE") line++;
    else if (ch === "EMAIL") email++;
  }
  return { line, email };
}

export const NOTIFY_USER_SELECT = {
  id: true,
  locale: true,
  lineUserId: true,
  lineFollowing: true,
  notifyVia: true,
  primaryEmail: true,
} as const;
