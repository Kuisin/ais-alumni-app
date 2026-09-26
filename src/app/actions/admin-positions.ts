"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { PositionKey } from "@/generated/prisma/enums";
import { audit } from "@/lib/audit";
import { isCurrentTeacher } from "@/lib/authz";
import { db } from "@/lib/db";
import { positionEligible } from "@/lib/permissions";
import { AuthError, actionAdmin } from "@/lib/session";

export type PositionFormState = { ok?: boolean; message?: string } | null;

const schema = z.object({
  userId: z.string().min(1).max(64),
  position: z.enum(PositionKey),
  grant: z.enum(["yes", "no"]),
  cohortId: z.string().trim(),
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
    cohortId: String(fd.get("cohortId") ?? ""),
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
    const cohort = parsed.data.cohortId
      ? await db.cohort.findUnique({
          where: { id: parsed.data.cohortId },
          select: { id: true },
        })
      : null;
    if (!cohort) return { ok: false, message: "errors.cohort" };
    cohortId = cohort.id;
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
  refresh();
  return { ok: true, message: "granted" };
}
