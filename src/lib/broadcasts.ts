import type { Prisma } from "@/generated/prisma/client";
import { AccountState, RoleKey } from "@/generated/prisma/enums";
import { getTranslatorFor } from "@/i18n/translator";
import { audit } from "@/lib/audit";
import { blockedUserIds } from "@/lib/authz";
import { db } from "@/lib/db";
import { displayName } from "@/lib/format";
import {
  estimateLinePushes,
  NOTIFY_USER_SELECT,
  notifyMany,
} from "@/lib/notify";
import {
  type Audience,
  type BroadcastRight,
  broadcastRights,
  gradeForClassOf,
} from "@/lib/permissions";
import type { CurrentUser } from "@/lib/session";

/** The signed-in member's notification rights (loads their positions). */
export async function getBroadcastRights(
  user: CurrentUser,
): Promise<BroadcastRight[]> {
  const positions = await db.userPosition.findMany({
    where: { userId: user.id },
    select: { position: true, cohortYear: true },
  });
  return broadcastRights({
    state: user.state,
    isAdmin: user.isAdmin,
    roles: user.roles.map((r) => r.role),
    positions,
  });
}

/**
 * ACTIVE members in the audience, excluding the sender and anyone who has
 * blocked (or been blocked by) the sender. A class (COHORT) is former
 * students with that graduation year plus current students expected to
 * graduate that year.
 */
export async function recipientsWhere(
  senderId: string,
  audience: Audience,
  now: Date = new Date(),
): Promise<Prisma.UserWhereInput> {
  const blocked = await blockedUserIds(senderId);
  const base: Prisma.UserWhereInput = {
    state: AccountState.ACTIVE,
    id: { notIn: [senderId, ...blocked] },
  };
  if (audience.scope === "ALL") {
    return audience.targetRoles.length
      ? { ...base, roles: { some: { role: { in: audience.targetRoles } } } }
      : base;
  }
  const grade = gradeForClassOf(audience.cohortYear, now);
  const cohort: Prisma.UserWhereInput[] = [
    {
      roles: {
        some: {
          role: RoleKey.FORMER_STUDENT,
          graduationOrLeaveYear: audience.cohortYear,
        },
      },
    },
  ];
  if (grade !== null) {
    cohort.push({
      roles: { some: { role: RoleKey.CURRENT_STUDENT, currentGrade: grade } },
    });
  }
  return { ...base, OR: cohort };
}

export type BroadcastPreview = {
  recipients: number;
  line: number;
  email: number;
};

export async function previewBroadcast(
  senderId: string,
  audience: Audience,
): Promise<BroadcastPreview> {
  const users = await db.user.findMany({
    where: await recipientsWhere(senderId, audience),
    select: NOTIFY_USER_SELECT,
  });
  return { recipients: users.length, ...estimateLinePushes(users) };
}

/** Record the broadcast and deliver it (LINE multicast or email per member). */
export async function sendBroadcast(params: {
  sender: CurrentUser;
  right: BroadcastRight;
  audience: Audience;
  title: string;
  body: string;
}): Promise<BroadcastPreview & { id: string }> {
  const { sender, right, audience, title, body } = params;
  const users = await db.user.findMany({
    where: await recipientsWhere(sender.id, audience),
    select: NOTIFY_USER_SELECT,
  });
  const counts = estimateLinePushes(users);
  const broadcast = await db.broadcast.create({
    data: {
      senderId: sender.id,
      position: right.position,
      scope: audience.scope,
      targetRoles: audience.scope === "ALL" ? audience.targetRoles : [],
      cohortYear: audience.scope === "COHORT" ? audience.cohortYear : null,
      title,
      body,
      recipientCount: users.length,
      lineCount: counts.line,
      emailCount: counts.email,
    },
  });
  await audit(
    sender.id,
    "broadcast.sent",
    { type: "Broadcast", id: broadcast.id },
    {
      position: right.position,
      audience: audience as unknown as Prisma.InputJsonValue,
      recipients: users.length,
    },
  );
  await notifyMany(users, {
    kind: "BROADCAST",
    refId: broadcast.id,
    dedupe: true,
    render: async (locale) => {
      const t = await getTranslatorFor(locale, "broadcast");
      const from = right.position
        ? t("signature", {
            name: displayName(sender, locale),
            position: t(`positions.${right.position}`),
          })
        : t("signatureCommittee");
      return { subject: title, text: `${body}\n\n${from}` };
    },
  });
  return { id: broadcast.id, recipients: users.length, ...counts };
}
