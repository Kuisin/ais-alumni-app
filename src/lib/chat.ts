import { ChatGroupKind, RoleKey } from "@/generated/prisma/enums";

/**
 * Group chats (pure rules, unit-tested). Every member is in the groups for
 * their type and 学年, added and removed automatically as their roles change:
 *  - 教職員, 在校生, 卒業生＋元在校生, 在校生保護者, 卒業生保護者
 *  - 第N期 (students and graduates of that class)
 *  - 第N期 保護者 (parents of a child in that class)
 *  - 18歳以上: everyone from the April 1 on or after their 18th birthday
 */

export const CHAT_PAGE_SIZE = 50;
export const MAX_CHAT_MESSAGE = 2000;

export type GroupSpec = {
  key: string;
  kind: ChatGroupKind;
  cohortId: string | null;
};

const STUDENT: RoleKey[] = [RoleKey.CURRENT_STUDENT, RoleKey.FORMER_STUDENT];
const PARENT: RoleKey[] = [RoleKey.CURRENT_PARENT, RoleKey.FORMER_PARENT];

export function groupKey(kind: ChatGroupKind, cohortId: string | null = null) {
  return cohortId ? `${kind}:${cohortId}` : kind;
}

const ROLE_GROUP: Partial<Record<RoleKey, ChatGroupKind>> = {
  [RoleKey.TEACHER]: ChatGroupKind.TEACHERS,
  [RoleKey.CURRENT_STUDENT]: ChatGroupKind.CURRENT_STUDENTS,
  [RoleKey.FORMER_STUDENT]: ChatGroupKind.FORMER_STUDENTS,
  [RoleKey.CURRENT_PARENT]: ChatGroupKind.CURRENT_PARENTS,
  [RoleKey.FORMER_PARENT]: ChatGroupKind.FORMER_PARENTS,
};

/** The latest April 1 (JST) on or before `now`, as a YYYY-MM-DD string. */
export function latestApril1(now: Date): string {
  const jst = new Date(now.getTime() + 9 * 3600_000);
  const y = jst.getUTCFullYear();
  const beforeApril = jst.getUTCMonth() < 3;
  return `${beforeApril ? y - 1 : y}-04-01`;
}

/**
 * In the 18歳以上 group: turned 18 on or before the latest April 1, so a
 * whole school year's worth of members joins together each April 1.
 */
export function isAdult(dateOfBirth: Date | null, now: Date): boolean {
  if (!dateOfBirth) return false;
  const dob = dateOfBirth.toISOString().slice(0, 10);
  const eighteenth = `${Number(dob.slice(0, 4)) + 18}${dob.slice(4)}`;
  return eighteenth <= latestApril1(now);
}

/** The groups a member belongs to. */
export function desiredGroups(
  roles: readonly { role: RoleKey; cohortId: string | null }[],
  childCohortIds: readonly string[],
  opts: { adult?: boolean } = {},
): GroupSpec[] {
  const out = new Map<string, GroupSpec>();
  const add = (kind: ChatGroupKind, cohortId: string | null = null) =>
    out.set(groupKey(kind, cohortId), {
      key: groupKey(kind, cohortId),
      kind,
      cohortId,
    });
  for (const r of roles) {
    const kind = ROLE_GROUP[r.role];
    if (kind) add(kind);
    if (STUDENT.includes(r.role) && r.cohortId)
      add(ChatGroupKind.COHORT, r.cohortId);
  }
  if (roles.some((r) => PARENT.includes(r.role)))
    for (const c of childCohortIds) add(ChatGroupKind.COHORT_PARENTS, c);
  if (opts.adult) add(ChatGroupKind.ADULTS);
  return [...out.values()];
}

/** Display order in the list: type groups first, then classes. */
export const KIND_ORDER: ChatGroupKind[] = [
  ChatGroupKind.TEACHERS,
  ChatGroupKind.CURRENT_STUDENTS,
  ChatGroupKind.FORMER_STUDENTS,
  ChatGroupKind.CURRENT_PARENTS,
  ChatGroupKind.FORMER_PARENTS,
  ChatGroupKind.ADULTS,
  ChatGroupKind.COHORT,
  ChatGroupKind.COHORT_PARENTS,
];
