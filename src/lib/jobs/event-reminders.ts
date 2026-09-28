import { AccountState, RsvpAnswer } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { reminderWindows, type Window } from "@/lib/events";
import { localized } from "@/lib/format";
import { NOTIFY_USER_SELECT, notifyMany } from "@/lib/notify";

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
      console.error(`[jobs/event-reminders] ${kind} ${event.id} failed`, e);
    }
  }
  return { events: events.length, recipients };
}

/**
 * Event reminders to GOING/MAYBE RSVPs of ACTIVE members (§10.3). Windows
 * are whole JST days (see reminderWindows): 7D = the date one week ahead,
 * 1D = tomorrow. De-duplicated per (kind, event id) so reruns are safe.
 */
export async function sendEventReminders(now: Date) {
  const windows = reminderWindows(now);
  return {
    reminder7d: await remind("EVENT_REMINDER_7D", windows.d7),
    reminder1d: await remind("EVENT_REMINDER_1D", windows.d1),
  };
}
