import { ChatGroupKind, RoleKey } from "@/generated/prisma/enums";

/**
 * Group chats (pure rules, unit-tested). Every member is in the groups for
 * their type and 学年, added and removed automatically as their roles change:
 *  - 教職員, 在校生, 卒業生＋元在校生, 在校生保護者, 卒業生保護者
 *  - 第N期 (students and graduates of that class)
 *  - 第N期 保護者 (parents of a child in that class)
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

/** The groups a member belongs to. */
export function desiredGroups(
  roles: readonly { role: RoleKey; cohortId: string | null }[],
  childCohortIds: readonly string[],
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
  return [...out.values()];
}

/** Display order in the list: type groups first, then classes. */
export const KIND_ORDER: ChatGroupKind[] = [
  ChatGroupKind.TEACHERS,
  ChatGroupKind.CURRENT_STUDENTS,
  ChatGroupKind.FORMER_STUDENTS,
  ChatGroupKind.CURRENT_PARENTS,
  ChatGroupKind.FORMER_PARENTS,
  ChatGroupKind.COHORT,
  ChatGroupKind.COHORT_PARENTS,
];
