import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { AccountState, RoleKey } from "@/generated/prisma/enums";
import { getTranslatorFor } from "@/i18n/translator";
import { membersInAudiences, rolesForAudiences } from "@/lib/audience";
import { audit } from "@/lib/audit";
import { blockedUserIds, isCurrentTeacher } from "@/lib/authz";
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
  type Holder,
  type StaffAccess,
  staffAccess,
} from "@/lib/permissions";
import type { CurrentUser } from "@/lib/session";

/** The member's roles and positions, loaded once per request. */
const loadHolder = cache(async (user: CurrentUser): Promise<Holder> => {
  const positions = await db.userPosition.findMany({
    where: { userId: user.id },
    select: { position: true, cohortId: true },
  });
  return {
    state: user.state,
    isAdmin: user.isAdmin,
    roles: user.roles.map((r) => r.role),
    currentTeacher: isCurrentTeacher(user.roles),
    positions,
  };
});

/** The signed-in member's notification rights (loads their positions). */
export async function getBroadcastRights(
  user: CurrentUser,
): Promise<BroadcastRight[]> {
  return broadcastRights(await loadHolder(user));
}

/** Which admin-mode pages the member may open. */
export async function getStaffAccess(user: CurrentUser): Promise<StaffAccess> {
  return staffAccess(await loadHolder(user));
}

/**
 * ACTIVE members in the audience, excluding the sender and anyone who has
 * blocked (or been blocked by) the sender. A 学年 (COHORT) audience is the
 * current and former students who selected that class.
 */
export async function recipientsWhere(
  senderId: string,
  audience: Audience,
): Promise<Prisma.UserWhereInput> {
  const blocked = await blockedUserIds(senderId);
  const base: Prisma.UserWhereInput = {
    state: AccountState.ACTIVE,
    id: { notIn: [senderId, ...blocked] },
  };
  if (audience.scope === "ALL") {
    return { ...base, ...membersInAudiences(audience.audiences) };
  }
  return {
    ...base,
    roles: {
      some: {
        role: { in: [RoleKey.FORMER_STUDENT, RoleKey.CURRENT_STUDENT] },
        cohortId: audience.cohortId,
      },
    },
  };
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
      targetAudiences: audience.scope === "ALL" ? audience.audiences : [],
      // Legacy column for older code.
      targetRoles:
        audience.scope === "ALL" ? rolesForAudiences(audience.audiences) : [],
      cohortId: audience.scope === "COHORT" ? audience.cohortId : null,
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
