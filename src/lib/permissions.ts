import { AccountState, PositionKey, RoleKey } from "@/generated/prisma/enums";

/**
 * Positions and the permissions they grant (pure; unit-tested).
 *
 * - Admin: may notify anyone.
 * - TEACHER_MANAGER (requires the TEACHER role): may notify all members,
 *   selected roles, or any class.
 * - STUDENT_LEADER (requires a student role): may notify their own class,
 *   i.e. members with the same graduation year (`cohortYear`).
 */

export type Holder = {
  state: AccountState;
  isAdmin: boolean;
  roles: readonly RoleKey[];
  positions: readonly { position: PositionKey; cohortYear: number | null }[];
};

export type BroadcastRight =
  | { kind: "ANY"; position: PositionKey | null } // null = as admin
  | { kind: "COHORT"; position: "STUDENT_LEADER"; cohortYear: number };

const STUDENT_ROLES: readonly RoleKey[] = [
  RoleKey.FORMER_STUDENT,
  RoleKey.CURRENT_STUDENT,
];

/** Whether a member's roles allow holding the position. */
export function positionEligible(
  position: PositionKey,
  roles: readonly RoleKey[],
): boolean {
  if (position === PositionKey.TEACHER_MANAGER)
    return roles.includes(RoleKey.TEACHER);
  return roles.some((r) => STUDENT_ROLES.includes(r));
}

export function broadcastRights(h: Holder): BroadcastRight[] {
  if (h.state !== AccountState.ACTIVE) return [];
  const rights: BroadcastRight[] = [];
  if (h.isAdmin) rights.push({ kind: "ANY", position: null });
  for (const p of h.positions) {
    if (!positionEligible(p.position, h.roles)) continue;
    if (p.position === PositionKey.TEACHER_MANAGER) {
      rights.push({ kind: "ANY", position: PositionKey.TEACHER_MANAGER });
    } else if (p.cohortYear !== null) {
      rights.push({
        kind: "COHORT",
        position: PositionKey.STUDENT_LEADER,
        cohortYear: p.cohortYear,
      });
    }
  }
  return rights;
}

export type Audience =
  | { scope: "ALL"; targetRoles: RoleKey[] } // [] = every member
  | { scope: "COHORT"; cohortYear: number };

/**
 * The right that authorises an audience, preferring the admin/manager right.
 * Returns null if the holder may not send to it.
 */
export function rightFor(
  rights: readonly BroadcastRight[],
  audience: Audience,
): BroadcastRight | null {
  const any = rights.find((r) => r.kind === "ANY");
  if (any) return any;
  if (audience.scope !== "COHORT") return null;
  return (
    rights.find(
      (r) => r.kind === "COHORT" && r.cohortYear === audience.cohortYear,
    ) ?? null
  );
}

/** Send limits per position (admins are unlimited). */
export const BROADCAST_LIMITS: Record<
  PositionKey,
  { count: number; windowMs: number }
> = {
  STUDENT_LEADER: { count: 5, windowMs: 7 * 24 * 60 * 60 * 1000 },
  TEACHER_MANAGER: { count: 20, windowMs: 24 * 60 * 60 * 1000 },
};

export function withinLimit(
  position: PositionKey | null,
  sentAt: readonly Date[],
  now: Date = new Date(),
): boolean {
  if (position === null) return true;
  const { count, windowMs } = BROADCAST_LIMITS[position];
  return (
    sentAt.filter((d) => now.getTime() - d.getTime() < windowMs).length < count
  );
}

/**
 * Assumption: the AIS school year starts in August, so in Aug–Dec the
 * current school year ends next calendar year. Uses Japan time.
 */
export function schoolYearEnd(now: Date = new Date()): number {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.getUTCMonth() >= 7
    ? jst.getUTCFullYear() + 1
    : jst.getUTCFullYear();
}

/** Expected graduation year of a current student in grade 0 (K)–12. */
export function classOf(currentGrade: number, now: Date = new Date()): number {
  return schoolYearEnd(now) + (12 - currentGrade);
}

/** Grade a current student in the given class is in now (null if not in school). */
export function gradeForClassOf(
  cohortYear: number,
  now: Date = new Date(),
): number | null {
  const grade = 12 - (cohortYear - schoolYearEnd(now));
  return grade >= 0 && grade <= 12 ? grade : null;
}
