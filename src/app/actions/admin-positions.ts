"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { PositionKey } from "@/generated/prisma/enums";
import { audit } from "@/lib/audit";
import { isCurrentTeacher } from "@/lib/authz";
import { syncChatMembership } from "@/lib/chat-db";
import { parseCohortNumber } from "@/lib/cohorts";
import { ensureCohort } from "@/lib/cohorts-db";
import { db } from "@/lib/db";
import { positionEligible } from "@/lib/permissions";
import { AuthError, actionAdmin } from "@/lib/session";

export type PositionFormState = { ok?: boolean; message?: string } | null;

const schema = z.object({
  userId: z.string().min(1).max(64),
  position: z.enum(PositionKey),
  grant: z.enum(["yes", "no"]),
  cohortNumber: z.string().trim(),
});

/** Admin: grant or remove a position (message = key in adminMembers.positions). */
export async function setMemberPositionAction(
  _prev: PositionFormState,
  fd: FormData,
): Promise<PositionFormState> {
  let admin: Awaited<ReturnType<typeof actionAdmin>>;
  try {
    admin = await actionAdmin();
  } catch (e) {
    if (e instanceof AuthError)
      return { ok: false, message: "errors.forbidden" };
    throw e;
  }
  const parsed = schema.safeParse({
    userId: fd.get("userId"),
    position: fd.get("position"),
    grant: fd.get("grant"),
    cohortNumber: String(fd.get("cohortNumber") ?? ""),
  });
  if (!parsed.success) return { ok: false, message: "errors.invalid" };
  const { userId, position } = parsed.data;

  if (parsed.data.grant === "no") {
    await db.userPosition.deleteMany({ where: { userId, position } });
    await audit(
      admin.id,
      "member.position_removed",
      { type: "User", id: userId },
      { position },
    );
    await syncChatMembership(userId).catch(() => {}); // leaves 学年代表 chat
    refresh();
    return { ok: true, message: "removed" };
  }

  const roles = await db.userRole.findMany({
    where: { userId },
    select: { role: true, teacherStatus: true },
  });
  if (
    !positionEligible(
      position,
      roles.map((r) => r.role),
      isCurrentTeacher(roles),
    )
  ) {
    return { ok: false, message: "errors.notEligible" };
  }
  let cohortId: string | null = null;
  if (position === PositionKey.STUDENT_LEADER) {
    const n = parseCohortNumber(parsed.data.cohortNumber);
    if (n == null) return { ok: false, message: "errors.cohort" };
    // Created on first use, like any 学年 assignment.
    cohortId = await ensureCohort(n);
  }
  await db.userPosition.upsert({
    where: { userId_position: { userId, position } },
    create: { userId, position, cohortId, grantedById: admin.id },
    update: { cohortId, grantedById: admin.id },
  });
  await audit(
    admin.id,
    "member.position_granted",
    { type: "User", id: userId },
    { position, cohortId },
  );
  await syncChatMembership(userId).catch(() => {}); // joins 学年代表 chat
  refresh();
  return { ok: true, message: "granted" };
}
