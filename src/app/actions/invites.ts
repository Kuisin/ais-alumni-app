"use server";

import { refresh } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { InviteType } from "@/generated/prisma/enums";
import { audit } from "@/lib/audit";
import { parseCohortNumber } from "@/lib/cohorts";
import { ensureCohort } from "@/lib/cohorts-db";
import { db } from "@/lib/db";
import {
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
  error?: "forbidden" | "cohort" | "tooMany" | "invalid";
} | null;

const schema = z.object({
  type: z.enum(InviteType),
  cohortNumber: z.string().trim().max(4),
  inviteeName: z
    .string()
    .trim()
    .max(100)
    .transform((v) => v || null),
});

/** Member: create a one-time invitation link. */
export async function createInviteAction(
  _prev: InviteFormState,
  fd: FormData,
): Promise<InviteFormState> {
  const me = await actionActive().catch(() => null);
  if (!me) return { ok: false, error: "forbidden" };
  const parsed = schema.safeParse({
    type: fd.get("type"),
    cohortNumber: String(fd.get("cohortNumber") ?? ""),
    inviteeName: String(fd.get("inviteeName") ?? ""),
  });
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { type, inviteeName } = parsed.data;
  // Students and parents are invited for a 学年 (theirs / their child's).
  let cohortId: string | null = null;
  if (type !== InviteType.TEACHER) {
    const n = parseCohortNumber(parsed.data.cohortNumber);
    if (n == null) return { ok: false, error: "cohort" };
    cohortId = await ensureCohort(n);
  }
  const open = await db.invite.count({
    where: {
      inviterId: me.id,
      usedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (open >= MAX_OPEN_INVITES) return { ok: false, error: "tooMany" };

  const token = newInviteToken();
  const invite = await db.invite.create({
    data: {
      tokenHash: hashInviteToken(token),
      inviterId: me.id,
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
    {
      type,
      cohortId,
    },
  );
  refresh();
  const locale = (await getLocale()) === "en" ? "en" : "ja";
  return { ok: true, url: inviteUrl(token, locale) };
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
