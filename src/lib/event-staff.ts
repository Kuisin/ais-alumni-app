import { AccountState } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/session";

/** Admins, the event's author and its assigned staff may check people in. */
export async function canCheckIn(
  user: Pick<CurrentUser, "id" | "isAdmin" | "state">,
  eventId: string,
): Promise<boolean> {
  if (user.state !== AccountState.ACTIVE) return false;
  if (user.isAdmin) return true;
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { createdById: true },
  });
  if (event?.createdById === user.id) return true;
  const row = await db.eventStaff.findUnique({
    where: { eventId_userId: { eventId, userId: user.id } },
    select: { userId: true },
  });
  return row !== null;
}
