"use server";

import { refresh } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { InviteKind, InviteType } from "@/generated/prisma/enums";
import { audit } from "@/lib/audit";
import { parseCohortNumber } from "@/lib/cohorts";
import { ensureCohort } from "@/lib/cohorts-db";
import { db } from "@/lib/db";
import {
  GRADE_INVITE_USES,
  hashInviteToken,
  INVITE_TTL_DAYS,
  inviteUrl,
  MAX_OPEN_INVITES,
  newInviteToken,
} from "@/lib/invites";
import { actionActive } from "@/lib/session";

export type InviteFormState = {
  ok: boolean;
  /** the link to share (shown once) */
  url?: string;
  kind?: "INDIVIDUAL" | "GRADE";
  error?: "forbidden" | "cohort" | "tooMany" | "invalid" | "gradeOpen";
} | null;

const schema = z.object({
  kind: z.enum(InviteKind).default(InviteKind.INDIVIDUAL),
  type: z.enum(InviteType),
  cohortNumber: z.string().trim().max(4),
  inviteeName: z
    .string()
    .trim()
    .max(100)
    .transform((v) => v || null),
});

/**
 * Member: create an invitation link — 個別 (one person, many allowed) or
 * 学年 (a 学年's students / parents, GRADE_INVITE_USES people, one open at a
 * time per 学年 and type).
 */
export async function createInviteAction(
  _prev: InviteFormState,
  fd: FormData,
): Promise<InviteFormState> {
  const me = await actionActive().catch(() => null);
  if (!me) return { ok: false, error: "forbidden" };
  const parsed = schema.safeParse({
    kind: fd.get("kind") || undefined,
    type: fd.get("type"),
    cohortNumber: String(fd.get("cohortNumber") ?? ""),
    inviteeName: String(fd.get("inviteeName") ?? ""),
  });
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { kind, type } = parsed.data;
  // A 学年 link isn't for one named person, and teachers have no 学年.
  const inviteeName =
    kind === InviteKind.GRADE ? null : parsed.data.inviteeName;
  if (kind === InviteKind.GRADE && type === InviteType.TEACHER)
    return { ok: false, error: "invalid" };
  // Students and parents are invited for a 学年 (theirs / their child's).
  let cohortId: string | null = null;
  if (type !== InviteType.TEACHER) {
    const n = parseCohortNumber(parsed.data.cohortNumber);
    if (n == null) return { ok: false, error: "cohort" };
    cohortId = await ensureCohort(n);
  }
  const openWhere = {
    inviterId: me.id,
    usedAt: null,
    revokedAt: null,
    expiresAt: { gt: new Date() },
  };
  if (kind === InviteKind.GRADE) {
    const same = await db.invite.count({
      where: { ...openWhere, kind, type, cohortId },
    });
    if (same) return { ok: false, error: "gradeOpen" };
  } else {
    const open = await db.invite.count({
      where: { ...openWhere, kind: InviteKind.INDIVIDUAL },
    });
    if (open >= MAX_OPEN_INVITES) return { ok: false, error: "tooMany" };
  }

  const token = newInviteToken();
  const invite = await db.invite.create({
    data: {
      tokenHash: hashInviteToken(token),
      inviterId: me.id,
      kind,
      maxUses: kind === InviteKind.GRADE ? GRADE_INVITE_USES : 1,
      type,
      cohortId,
      inviteeName,
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000),
    },
    select: { id: true },
  });
  await audit(
    me.id,
    "invite.create",
    { type: "Invite", id: invite.id },
    { kind, type, cohortId },
  );
  refresh();
  const locale = (await getLocale()) === "en" ? "en" : "ja";
  return { ok: true, url: inviteUrl(token, locale), kind };
}

/** Member: cancel one of their unused invitations. */
export async function revokeInviteAction(fd: FormData): Promise<void> {
  const me = await actionActive();
  const id = z.string().min(1).max(64).parse(fd.get("id"));
  await db.invite.updateMany({
    where: { id, inviterId: me.id, usedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  refresh();
}
