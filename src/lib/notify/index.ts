import type { Locale } from "@/generated/prisma/enums";

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { linePush } from "@/lib/line";
import { NOTIFY_KINDS, type NotifyKind, wantsKind } from "./catalog";
import { renderEmail } from "./email-template";
import {
  createNotificationLink,
  ensureLinkCode,
  linkUrl,
  recipientUrl,
} from "./links";
import {
  lineText,
  type NotifyParams,
  type RenderedNotification,
  renderNotification,
} from "./render";
import {
  type Channel,
  channelsFor,
  deliverWithFallback,
  type RoutableUser,
} from "./route";

const LOCALES: Locale[] = ["ja", "en"];

export { NOTIFY_KINDS, type NotifyKind } from "./catalog";
export { channelsFor, chooseChannel } from "./route";

export type NotifyUser = RoutableUser & {
  id: string;
  locale: Locale;
  /** categories turned off (Settings → Notifications) */
  notifyOff?: string[];
  nameRomaji?: string | null;
  nameKanji?: string | null;
  /** short code for their notification links (created on first send) */
  linkCode?: string | null;
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

/** Run `fn` over `items`, at most `limit` at a time. */
async function inBatches<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += limit) {
    await Promise.all(items.slice(i, i + limit).map(fn));
  }
}

/**
 * Send one notification to many users (src/lib/notify/catalog.ts rules):
 * members who turned the category off are skipped; texts are rendered once
 * per language with one short link for everyone, and every recipient gets
 * their own URL (/n/<their code>/<token>) so their open is recorded as a
 * read receipt. LINE pushes go one per member (the push quota counts
 * recipients either way).
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
  const spec = NOTIFY_KINDS[n.kind];
  const recipients: { user: NotifyUser; channels: Channel[] }[] = [];
  for (const u of users) {
    if (skip.has(u.id) || !wantsKind(u.notifyOff, n.kind)) continue;
    const channels = channelsFor(u, { line: "line" in spec }).filter((ch) =>
      ch === "LINE" ? Boolean(u.lineUserId) : Boolean(u.primaryEmail),
    );
    if (channels.length) recipients.push({ user: u, channels });
    else result.set(u.id, []);
  }
  if (!recipients.length) return result;

  // Both languages: messages use each member's, and the one link keeps
  // both so its preview follows the opener's current language.
  const rendered = {} as Record<Locale, RenderedNotification>;
  for (const locale of LOCALES) {
    const params =
      typeof n.params === "function" ? await n.params(locale) : n.params;
    rendered[locale] = await renderNotification(n.kind, locale, params);
  }
  const link = n.path
    ? await createNotificationLink({
        kind: n.kind,
        category: spec.category,
        texts: {
          ja: { title: rendered.ja.title, body: rendered.ja.body },
          en: { title: rendered.en.title, body: rendered.en.body },
        },
        refId: n.refId,
        path: n.path,
      })
    : null;
  type Job = {
    user: NotifyUser;
    channels: Channel[];
    rendered: RenderedNotification;
    link: { id: string; token: string } | null;
  };
  const jobs: Job[] = recipients.map((r) => ({
    ...r,
    rendered: rendered[r.user.locale],
    link,
  }));

  const logs: { userId: string; channel: Channel }[] = [];
  const receipts: { linkId: string; userId: string; channels: Channel[] }[] =
    [];
  await inBatches(jobs, 8, async ({ user: u, channels, rendered, link }) => {
    let url: string | null = null;
    if (link) {
      try {
        url = recipientUrl(link.token, await ensureLinkCode(u));
      } catch (e) {
        // Still deliver, without a read receipt.
        console.error(`[notify] link code for ${u.id} failed`, e);
        url = linkUrl(link.token);
      }
    }
    // A failed LINE push (e.g. the month's allowance is used up) falls
    // back to email.
    const sent = await deliverWithFallback(
      channels,
      Boolean(u.primaryEmail),
      async (ch) => {
        if (ch === "LINE" && u.lineUserId) {
          await linePush(u.lineUserId, [
            { type: "text", text: lineText(rendered, url) },
          ]);
        } else if (ch === "EMAIL" && u.primaryEmail) {
          const mail = await renderEmail({
            rendered,
            locale: u.locale,
            recipientName: u.nameRomaji ?? u.nameKanji ?? null,
            url,
            note: n.note,
          });
          await sendEmail({ to: u.primaryEmail, ...mail });
        }
      },
      (ch, e) => console.error(`[notify] ${ch} to ${u.id} failed`, e),
    );
    for (const ch of sent) logs.push({ userId: u.id, channel: ch });
    if (link && sent.length)
      receipts.push({ linkId: link.id, userId: u.id, channels: sent });
    result.set(u.id, sent);
  });

  if (receipts.length) {
    await db.notificationReceipt.createMany({
      data: receipts,
      skipDuplicates: true,
    });
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

/** Estimated LINE / email counts for sending `kind` to these users (§11). */
export function estimateLinePushes(
  users: RoutableUser[],
  kind: NotifyKind,
): {
  line: number;
  email: number;
} {
  let line = 0;
  let email = 0;
  const lineOk = "line" in NOTIFY_KINDS[kind];
  for (const u of users) {
    const ch = channelsFor(u, { line: lineOk })[0];
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
  linkCode: true,
} as const;
