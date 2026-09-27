import { createHash, randomBytes } from "node:crypto";
import { InviteType } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { publicUrl } from "@/lib/urls";

/**
 * Member invitations (one-time links). A member says who they're inviting
 * (type and 学年); the invitee signs up through the link, and admins see the
 * inviter's word next to the application, which speeds up approval. Only a
 * hash of the token is stored; a link works once and expires after 30 days.
 */

export const INVITE_TTL_DAYS = 30;
export const MAX_OPEN_INVITES = 20;
/** Cookie holding the token between opening the link and applying. */
export const INVITE_COOKIE = "ais_invite";

export function newInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** The link to share (opens the app with the invitation). */
export function inviteUrl(token: string, locale: "ja" | "en"): string {
  return publicUrl(`/api/invite/${token}?l=${locale}`);
}

/** A usable invitation for this token (unused, not revoked or expired). */
export async function findOpenInvite(token: string | undefined | null) {
  if (!token || token.length > 100) return null;
  return db.invite.findFirst({
    where: {
      tokenHash: hashInviteToken(token),
      usedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      type: true,
      inviterId: true,
      inviteeName: true,
      cohort: { select: { number: true } },
      inviter: { select: { nameRomaji: true, nameKanji: true } },
    },
  });
}

/** Mark the invitation used by this applicant (no-op if already used). */
export async function consumeInvite(
  token: string | undefined | null,
  userId: string,
): Promise<boolean> {
  if (!token || token.length > 100) return false;
  try {
    const res = await db.invite.updateMany({
      where: {
        tokenHash: hashInviteToken(token),
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        inviterId: { not: userId },
      },
      data: { usedAt: new Date(), usedById: userId },
    });
    return res.count > 0;
  } catch {
    // usedById is unique: this applicant already used another invitation.
    return false;
  }
}

export type InviteMatch = "match" | "mismatch" | "unknown";

/**
 * Does the application agree with what the inviter said? Students: same
 * 学年; parents: a child in that 学年; teachers: applied as a teacher.
 */
export function inviteMatches(
  invite: { type: InviteType; cohortNumber: number | null },
  answers: unknown,
): InviteMatch {
  const a = (answers ?? {}) as {
    types?: string[];
    student?: { cohortNumber?: number };
    parent?: { children?: { cohortNumber?: number }[] };
  };
  const types = Array.isArray(a.types) ? a.types : [];
  if (invite.type === InviteType.TEACHER)
    return types.includes("TEACHER") ? "match" : "mismatch";
  if (!types.includes(invite.type)) return "mismatch";
  if (invite.cohortNumber === null) return "unknown";
  if (invite.type === InviteType.STUDENT)
    return a.student?.cohortNumber === invite.cohortNumber
      ? "match"
      : "mismatch";
  const kids = a.parent?.children ?? [];
  // Registered children carry no 学年 in the answers.
  if (!kids.some((c) => typeof c.cohortNumber === "number")) return "unknown";
  return kids.some((c) => c.cohortNumber === invite.cohortNumber)
    ? "match"
    : "mismatch";
}
