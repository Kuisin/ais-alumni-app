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

/** Key of the 1:1 talk between two members (order-independent). */
export function directKey(a: string, b: string): string {
  return `${ChatGroupKind.DIRECT}:${[a, b].sort().join(":")}`;
}

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

// ─── Mentions (@name, @全員) ─────────────────────────────────────────────

export const MAX_MENTIONS = 50;

/** An "@query" being typed right before the caret, if any. */
export function mentionQuery(
  text: string,
  caret: number,
): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const at = before.lastIndexOf("@");
  if (at < 0) return null;
  if (at > 0 && !/\s/.test(before[at - 1])) return null;
  const query = before.slice(at + 1);
  if (/[\n@]/.test(query) || query.length > 30) return null;
  return { start: at, query };
}

/** Replace the "@query" with "@label " and return the new caret. */
export function applyMention(
  text: string,
  start: number,
  caret: number,
  label: string,
): { text: string; caret: number } {
  const insert = `@${label} `;
  return {
    text: text.slice(0, start) + insert + text.slice(caret),
    caret: start + insert.length,
  };
}

/** Who is mentioned in the text: members by "@name", everyone by "@全員". */
export function mentionsIn(
  text: string,
  members: readonly { id: string; name: string }[],
  allLabels: readonly string[],
): { userIds: string[]; all: boolean } {
  const userIds = members
    .filter((m) => text.includes(`@${m.name}`))
    .map((m) => m.id)
    .slice(0, MAX_MENTIONS);
  const all = allLabels.some((l) => text.includes(`@${l}`));
  return { userIds, all };
}

/** Split a message into plain text and "@mention" parts (for highlighting). */
export function splitMentions(
  body: string,
  labels: readonly string[],
): { text: string; mention: boolean }[] {
  const names = [...new Set(labels.filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  );
  if (!names.length) return [{ text: body, mention: false }];
  const out: { text: string; mention: boolean }[] = [];
  let i = 0;
  let plain = "";
  while (i < body.length) {
    const hit =
      body[i] === "@" ? names.find((n) => body.startsWith(n, i + 1)) : null;
    if (hit) {
      if (plain) out.push({ text: plain, mention: false });
      plain = "";
      out.push({ text: `@${hit}`, mention: true });
      i += hit.length + 1;
    } else {
      plain += body[i];
      i++;
    }
  }
  if (plain) out.push({ text: plain, mention: false });
  return out;
}
