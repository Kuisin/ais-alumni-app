import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

/** Record an admin action (§15 Observability). */
export async function audit(
  actorId: string | null,
  action: string,
  target?: { type: string; id: string },
  data?: Prisma.InputJsonValue,
): Promise<void> {
  await db.auditLog.create({
    data: {
      actorId,
      action,
      targetType: target?.type,
      targetId: target?.id,
      data,
    },
  });
}
