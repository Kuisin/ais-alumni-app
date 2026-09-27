import { AccountState, RsvpAnswer } from "@/generated/prisma/enums";
import { isAuthorizedCron } from "@/lib/cron";
import { db } from "@/lib/db";
import { reminderWindows, type Window } from "@/lib/events";
import { localized } from "@/lib/format";
import { dueScheduledNews, sendNewsNotification } from "@/lib/news";
import { NOTIFY_USER_SELECT, notifyMany } from "@/lib/notify";

/**
 * Daily at 09:00 JST (vercel.ts: "0 0 * * *" UTC).
 *  - Event reminders to GOING/MAYBE RSVPs of ACTIVE members (§10.3). Windows
 *    are whole JST days (see reminderWindows): 7D = the date one week ahead,
 *    1D = tomorrow. De-duplicated per (kind, event id) so reruns are safe.
 *  - Announces scheduled news posts that have become published (§10.4).
 */
export const maxDuration = 300;

type Kind = "EVENT_REMINDER_7D" | "EVENT_REMINDER_1D";

async function remind(
  kind: Kind,
  window: Window,
): Promise<{ events: number; recipients: number }> {
  const events = await db.event.findMany({
    where: { startsAt: { gte: window.from, lt: window.to } },
    select: {
      id: true,
      titleJa: true,
      titleEn: true,
      startsAt: true,
      location: true,
      rsvps: {
        where: {
          answer: { in: [RsvpAnswer.GOING, RsvpAnswer.MAYBE] },
          user: { state: AccountState.ACTIVE },
        },
        select: { user: { select: NOTIFY_USER_SELECT } },
      },
    },
  });

  let recipients = 0;
  for (const event of events) {
    const users = event.rsvps.map((r) => r.user);
    if (!users.length) continue;
    try {
      const sent = await notifyMany(users, {
        kind,
        refId: event.id,
        dedupe: true,
        path: `/app/events/${event.id}`,
        params: (locale) => ({
          title: localized(event.titleJa, event.titleEn, locale).text,
          when: event.startsAt,
          location: event.location,
        }),
      });
      recipients += sent.size;
    } catch (e) {
      // One failing event must not block the others.
      console.error(`[cron/reminders] ${kind} for event ${event.id} failed`, e);
    }
  }
  return { events: events.length, recipients };
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request))
    return new Response("Unauthorized", { status: 401 });

  const now = new Date();
  const windows = reminderWindows(now);
  const week = await remind("EVENT_REMINDER_7D", windows.d7);
  const day = await remind("EVENT_REMINDER_1D", windows.d1);

  let newsPosts = 0;
  let newsRecipients = 0;
  for (const post of await dueScheduledNews(now)) {
    try {
      const res = await sendNewsNotification(post.id, now);
      if (res) {
        newsPosts++;
        newsRecipients += res.recipients;
      }
    } catch (e) {
      console.error(`[cron/reminders] news ${post.id} failed`, e);
    }
  }

  return Response.json({
    ok: true,
    ranAt: now.toISOString(),
    reminder7d: { ...week, window: windows.d7 },
    reminder1d: { ...day, window: windows.d1 },
    news: { posts: newsPosts, recipients: newsRecipients },
  });
}
