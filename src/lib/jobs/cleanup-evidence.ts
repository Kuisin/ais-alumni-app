import { db } from "@/lib/db";
import { deletePrivate } from "@/lib/storage";

/**
 * Delete verification evidence 30 days after the decision (§6.3). A row is
 * removed only after its storage object is deleted, so a failed delete is
 * retried on the next run.
 */
export async function cleanupEvidence(now: Date) {
  const due = await db.verificationEvidence.findMany({
    where: { deleteAfter: { lt: now } },
    select: { id: true, storageKey: true },
    take: 1000,
  });

  const deletedIds: string[] = [];
  let failed = 0;
  for (const row of due) {
    try {
      await deletePrivate(row.storageKey);
      deletedIds.push(row.id);
    } catch (e) {
      failed++;
      console.error(`[jobs/cleanup-evidence] ${row.storageKey}`, e);
    }
  }
  const { count } = deletedIds.length
    ? await db.verificationEvidence.deleteMany({
        where: { id: { in: deletedIds } },
      })
    : { count: 0 };

  return {
    due: due.length,
    objectsDeleted: deletedIds.length,
    rowsDeleted: count,
    failed,
  };
}
