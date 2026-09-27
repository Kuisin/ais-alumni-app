import { AccountState, PositionKey, RoleKey } from "@/generated/prisma/enums";

/**
 * Positions and the permissions they grant (pure; unit-tested).
 *
 * - Admin: may notify anyone.
 * - TEACHER_MANAGER (requires a current teacher, status 現職): may notify all members,
 *   selected roles, or any class.
 * - STUDENT_LEADER (requires a student role): may notify their own 学年
 *   (`cohortId`), i.e. students who selected that class.
 * - TEACHER_REGISTRAR (any member the admins choose): may mark members as
 *   current teachers (現職) or move them to former.
 */

export type Holder = {
  state: AccountState;
  isAdmin: boolean;
  roles: readonly RoleKey[];
  /** TEACHER role with status 現職 */
  currentTeacher: boolean;
  positions: readonly { position: PositionKey; cohortId: string | null }[];
};

export type BroadcastRight =
  | { kind: "ANY"; position: PositionKey | null } // null = as admin
  | { kind: "COHORT"; position: "STUDENT_LEADER"; cohortId: string };

const STUDENT_ROLES: readonly RoleKey[] = [
  RoleKey.FORMER_STUDENT,
  RoleKey.CURRENT_STUDENT,
];

/** Whether a member's roles allow holding the position. */
export function positionEligible(
  position: PositionKey,
  roles: readonly RoleKey[],
  currentTeacher: boolean,
): boolean {
  if (position === PositionKey.TEACHER_MANAGER)
    return roles.includes(RoleKey.TEACHER) && currentTeacher;
  if (position === PositionKey.TEACHER_REGISTRAR) return true;
  return roles.some((r) => STUDENT_ROLES.includes(r));
}

export function broadcastRights(h: Holder): BroadcastRight[] {
  if (h.state !== AccountState.ACTIVE) return [];
  const rights: BroadcastRight[] = [];
  if (h.isAdmin) rights.push({ kind: "ANY", position: null });
  for (const p of h.positions) {
    if (!positionEligible(p.position, h.roles, h.currentTeacher)) continue;
    if (p.position === PositionKey.TEACHER_REGISTRAR) continue;
    if (p.position === PositionKey.TEACHER_MANAGER) {
      rights.push({ kind: "ANY", position: PositionKey.TEACHER_MANAGER });
    } else if (p.cohortId !== null) {
      rights.push({
        kind: "COHORT",
        position: PositionKey.STUDENT_LEADER,
        cohortId: p.cohortId,
      });
    }
  }
  return rights;
}

export type Audience =
  | { scope: "ALL"; targetRoles: RoleKey[] } // [] = every member
  | { scope: "COHORT"; cohortId: string };

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
      (r) => r.kind === "COHORT" && r.cohortId === audience.cohortId,
    ) ?? null
  );
}

/** Send limits per position (admins are unlimited). */
export const BROADCAST_LIMITS: Partial<
  Record<PositionKey, { count: number; windowMs: number }>
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
  const limit = BROADCAST_LIMITS[position];
  if (!limit) return false; // positions without a send right
  const { count, windowMs } = limit;
  return (
    sentAt.filter((d) => now.getTime() - d.getTime() < windowMs).length < count
  );
}

/** What a member may open in admin mode. */
export type StaffAccess = {
  /** the full committee admin area */
  admin: boolean;
  /** the send-notification page */
  broadcast: boolean;
  /** the current-teachers page */
  teachers: boolean;
};

export function staffAccess(h: Holder): StaffAccess {
  const active = h.state === AccountState.ACTIVE;
  return {
    admin: active && h.isAdmin,
    broadcast: broadcastRights(h).length > 0,
    teachers:
      active &&
      (h.isAdmin ||
        h.positions.some((p) => p.position === PositionKey.TEACHER_REGISTRAR)),
  };
}

/** Whether the member sees the admin-mode switch at all. */
export function hasStaffAccess(a: StaffAccess): boolean {
  return a.admin || a.broadcast || a.teachers;
}
