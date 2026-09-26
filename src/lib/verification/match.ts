import { RoleKey } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { bestRosterMatch, type RosterApplicant } from "./roster";
import type { VerificationData } from "./schema";

/**
 * Compare an application with unclaimed roster rows of the applicant's role
 * kinds (§6.4.1). Returns null when the roster has no rows to compare with
 * (the roster is optional, Open Q1).
 */
export async function computeRosterMatch(
  data: VerificationData,
): Promise<{ rowId: string; score: number } | null> {
  const dob = new Date(`${data.dateOfBirth}T00:00:00Z`);
  const base = {
    nameRomaji: data.nameRomaji,
    nameKanji: data.nameKanji,
    nameAtAis: data.nameAtAis,
    dateOfBirth: dob,
  };
  const applicants: Partial<Record<RoleKey, RosterApplicant>> = {};
  for (const role of data.roles) {
    if (role === RoleKey.FORMER_STUDENT && data.formerStudent) {
      applicants[role] = {
        ...base,
        yearsFrom: data.formerStudent.yearsFrom,
        yearsTo: data.formerStudent.yearsTo,
      };
    } else if (role === RoleKey.TEACHER && data.teacher) {
      applicants[role] = {
        ...base,
        yearsFrom: data.teacher.yearsFrom,
        yearsTo: data.teacher.yearsTo,
      };
    } else {
      applicants[role] = base;
    }
  }

  const rows = await db.rosterEntry.findMany({
    where: { kind: { in: data.roles }, claimedByUserId: null },
    select: {
      id: true,
      kind: true,
      nameRomaji: true,
      nameKanji: true,
      dateOfBirth: true,
      yearsFrom: true,
      yearsTo: true,
    },
  });
  if (!rows.length) return null;

  let best: { rowId: string; score: number } | null = null;
  for (const role of data.roles) {
    const applicant = applicants[role];
    if (!applicant) continue;
    const m = bestRosterMatch(
      applicant,
      rows.filter((r) => r.kind === role),
    );
    if (m && (!best || m.score > best.score)) best = m;
  }
  return best;
}
