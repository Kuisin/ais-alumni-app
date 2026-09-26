"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { PositionKey } from "@/generated/prisma/enums";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { positionEligible } from "@/lib/permissions";
import { AuthError, actionAdmin } from "@/lib/session";

export type PositionFormState = { ok?: boolean; message?: string } | null;

const schema = z.object({
  userId: z.string().min(1).max(64),
  position: z.enum(PositionKey),
  grant: z.enum(["yes", "no"]),
  cohortYear: z.string().trim(),
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
    cohortYear: String(fd.get("cohortYear") ?? ""),
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
    select: { role: true },
  });
  if (
    !positionEligible(
      position,
      roles.map((r) => r.role),
    )
  ) {
    return { ok: false, message: "errors.notEligible" };
  }
  let cohortYear: number | null = null;
  if (position === PositionKey.STUDENT_LEADER) {
    if (!/^\d{4}$/.test(parsed.data.cohortYear))
      return { ok: false, message: "errors.cohortYear" };
    cohortYear = Number(parsed.data.cohortYear);
  }
  await db.userPosition.upsert({
    where: { userId_position: { userId, position } },
    create: { userId, position, cohortYear, grantedById: admin.id },
    update: { cohortYear, grantedById: admin.id },
  });
  await audit(
    admin.id,
    "member.position_granted",
    { type: "User", id: userId },
    { position, cohortYear },
  );
  refresh();
  return { ok: true, message: "granted" };
}
