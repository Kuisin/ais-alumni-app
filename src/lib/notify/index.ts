import type { Locale } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { lineMulticast, linePush } from "@/lib/line";
import { NOTIFY_KINDS, type NotifyKind, wantsKind } from "./catalog";
import { renderEmail } from "./email-template";
import { createNotificationLink } from "./links";
import {
  lineText,
  type NotifyParams,
  type RenderedNotification,
  renderNotification,
} from "./render";
import { type Channel, channelsFor, type RoutableUser } from "./route";

export { NOTIFY_KINDS, type NotifyKind } from "./catalog";
export { channelsFor, chooseChannel } from "./route";

export type NotifyUser = RoutableUser & {
  id: string;
  locale: Locale;
  /** categories turned off (Settings → Notifications) */
  notifyOff?: string[];
  nameRomaji?: string | null;
  nameKanji?: string | null;
};

export type Notification = {
  kind: NotifyKind;
  refId?: string;
  /** Skip users who already have a log row for (kind, refId). */
  dedupe?: boolean;
  /** App page without the locale ("/app/news/x"); null = no link. */
  path: string | null;
  /** Template values; a function when they depend on the language. */
  params?:
    | NotifyParams
    | ((locale: Locale) => NotifyParams | Promise<NotifyParams>);
  /** Committee note etc. — email only, never on LINE. */
  note?: string | null;
};

async function alreadySent(
  userIds: string[],
  n: Notification,
): Promise<Set<string>> {
  if (!n.dedupe) return new Set();
  const rows = await db.notificationLog.findMany({
    where: { userId: { in: userIds }, kind: n.kind, refId: n.refId ?? null },
    select: { userId: true },
  });
  return new Set(rows.map((r) => r.userId));
}

/** Send one notification to one user via the routed channel(s). */
export async function notify(
  user: NotifyUser,
  n: Notification,
): Promise<Channel[]> {
  return (await notifyMany([user], n)).get(user.id) ?? [];
}

/**
 * Send one notification to many users (src/lib/notify/catalog.ts rules):
 * members who turned the category off are skipped; texts are rendered once
 * per language with one short /n/ link; LINE recipients sharing a language
 * are batched into multicast calls to conserve the push quota (§11).
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
  const perLocale = new Map<
    Locale,
    { rendered: RenderedNotification; url: string | null }
  >();
  const lineByLocale = new Map<Locale, string[]>();
  const logs: { userId: string; channel: Channel }[] = [];
  const spec = NOTIFY_KINDS[n.kind];

  for (const u of users) {
    if (skip.has(u.id) || !wantsKind(u.notifyOff, n.kind)) continue;
    let prepared = perLocale.get(u.locale);
    if (!prepared) {
      const params =
        typeof n.params === "function" ? await n.params(u.locale) : n.params;
      const rendered = await renderNotification(n.kind, u.locale, params);
      const url = n.path
        ? await createNotificationLink({
            rendered,
            refId: n.refId,
            locale: u.locale,
            path: n.path,
          })
        : null;
      prepared = { rendered, url };
      perLocale.set(u.locale, prepared);
    }
    const channels = channelsFor(u, { alwaysEmail: "alwaysEmail" in spec });
    for (const ch of channels) {
      if (ch === "LINE" && u.lineUserId) {
        const list = lineByLocale.get(u.locale) ?? [];
        list.push(u.lineUserId);
        lineByLocale.set(u.locale, list);
      } else if (ch === "EMAIL" && u.primaryEmail) {
        try {
          const mail = await renderEmail({
            rendered: prepared.rendered,
            locale: u.locale,
            recipientName: u.nameRomaji ?? u.nameKanji ?? null,
            url: prepared.url,
            note: n.note,
          });
          await sendEmail({ to: u.primaryEmail, ...mail });
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
    const { rendered, url } = perLocale.get(locale) as {
      rendered: RenderedNotification;
      url: string | null;
    };
    const messages = [{ type: "text" as const, text: lineText(rendered, url) }];
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
  notifyOff: true,
  nameRomaji: true,
  nameKanji: true,
} as const;
