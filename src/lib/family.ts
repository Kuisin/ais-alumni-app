import type { Prisma } from "@/generated/prisma/client";
import {
  AccountState,
  FamilyLinkInitiator,
  RoleKey,
} from "@/generated/prisma/enums";
import type { AppLocale } from "@/i18n/routing";
import { getTranslatorFor } from "@/i18n/translator";
import {
  blockedUserIds,
  canViewProfile,
  isMinor,
  loadRelationship,
  toViewer,
} from "@/lib/authz";
import { db } from "@/lib/db";
import {
  nameTokens,
  PUBLIC_CARD_SELECT,
  type PublicCard,
} from "@/lib/directory";
import { displayName } from "@/lib/format";
import { NOTIFY_USER_SELECT, notify } from "@/lib/notify";
import type { CurrentUser } from "@/lib/session";
import { appUrl } from "@/lib/urls";

/** Families and parent/child links (§8). */

export const PARENT_ROLES: readonly RoleKey[] = [
  RoleKey.CURRENT_PARENT,
  RoleKey.FORMER_PARENT,
];
export const CHILD_ROLES: readonly RoleKey[] = [
  RoleKey.CURRENT_STUDENT,
  RoleKey.FORMER_STUDENT,
];
/** Cap on unconfirmed links one user may have open (anti-spam). */
export const MAX_PENDING_LINKS = 20;

export type Direction = "child" | "parent";

export function hasAnyRole(
  roles: readonly RoleKey[],
  wanted: readonly RoleKey[],
): boolean {
  return roles.some((r) => wanted.includes(r));
}

/** Can a user with these roles claim a child / a parent? */
export function canClaim(roles: readonly RoleKey[], direction: Direction) {
  return hasAnyRole(roles, direction === "child" ? PARENT_ROLES : CHILD_ROLES);
}

export type FamilyMergePlan =
  | { kind: "create" }
  | { kind: "none"; familyId: string }
  | { kind: "join"; familyId: string; joiner: "parent" | "child" }
  | { kind: "merge"; into: string; from: string };

/**
 * How to unite parent and child into one Family on confirmation (§8): create
 * one if neither has a family; if only one has, the other joins; if both have
 * different families, every member of the child's family moves to the
 * parent's.
 */
export function planFamilyMerge(
  parentFamilyId: string | null,
  childFamilyId: string | null,
): FamilyMergePlan {
  if (!parentFamilyId && !childFamilyId) return { kind: "create" };
  if (parentFamilyId && parentFamilyId === childFamilyId)
    return { kind: "none", familyId: parentFamilyId };
  if (parentFamilyId && !childFamilyId)
    return { kind: "join", familyId: parentFamilyId, joiner: "child" };
  if (!parentFamilyId && childFamilyId)
    return { kind: "join", familyId: childFamilyId, joiner: "parent" };
  return {
    kind: "merge",
    into: parentFamilyId as string,
    from: childFamilyId as string,
  };
}

export type Confirmer = "parent" | "child" | "admin";

/**
 * Who must confirm a link: the side that didn't initiate it. A parent's claim
 * of a child without an account can only be confirmed by an admin.
 */
export function confirmerFor(link: {
  initiatedBy: FamilyLinkInitiator;
  childId: string | null;
}): Confirmer {
  if (link.initiatedBy === FamilyLinkInitiator.CHILD) return "parent";
  return link.childId ? "child" : "admin";
}

export function canConfirm(
  userId: string,
  link: {
    initiatedBy: FamilyLinkInitiator;
    parentId: string;
    childId: string | null;
    confirmedAt: Date | null;
  },
): boolean {
  if (link.confirmedAt) return false;
  const who = confirmerFor(link);
  if (who === "parent") return link.parentId === userId;
  if (who === "child") return link.childId === userId;
  return false;
}

export function normalizeName(s: string): string {
  return s.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Minors are hidden from the directory, but a parent must be able to find
 * their own child. Compromise: a minor appears in family search only if the
 * query equals their full registered name (romaji, kanji or name at AIS).
 */
export function exactNameMatch(
  q: string,
  u: {
    nameRomaji: string | null;
    nameKanji: string | null;
    nameAtAis: string | null;
  },
): boolean {
  const n = normalizeName(q);
  if (!n) return false;
  return [u.nameRomaji, u.nameKanji, u.nameAtAis].some((x) => {
    if (!x) return false;
    const m = normalizeName(x);
    return m === n || m.replace(/ /g, "") === n.replace(/ /g, "");
  });
}

// ---------------------------------------------------------------- queries

export type FamilyCandidate = PublicCard & { limited: boolean };

/** ACTIVE members who could be my child/parent, matching a name search. */
export async function searchFamilyCandidates(
  me: CurrentUser,
  q: string,
  direction: Direction,
  now: Date = new Date(),
): Promise<FamilyCandidate[]> {
  const tokens = nameTokens(q);
  if (!tokens.length || q.trim().length < 2) return [];
  const blocked = await blockedUserIds(me.id);
  const wanted = direction === "child" ? CHILD_ROLES : PARENT_ROLES;
  const rows = await db.user.findMany({
    where: {
      AND: [
        { state: AccountState.ACTIVE },
        { id: { notIn: [me.id, ...blocked] } },
        { roles: { some: { role: { in: [...wanted] } } } },
        ...tokens.map((token) => ({
          OR: [
            { nameRomaji: { contains: token, mode: "insensitive" as const } },
            { nameKanji: { contains: token, mode: "insensitive" as const } },
            { nameAtAis: { contains: token, mode: "insensitive" as const } },
          ],
        })),
      ],
    },
    orderBy: [{ nameRomaji: "asc" }, { id: "asc" }],
    take: 30,
    select: {
      ...PUBLIC_CARD_SELECT,
      state: true,
      dateOfBirth: true,
      familyId: true,
    },
  });
  const viewer = toViewer(me);
  const out: FamilyCandidate[] = [];
  for (const r of rows) {
    const target = {
      id: r.id,
      state: r.state,
      roles: r.roles.map((x) => x.role),
      dateOfBirth: r.dateOfBirth,
      familyId: r.familyId,
    };
    const card: PublicCard = {
      id: r.id,
      nameRomaji: r.nameRomaji,
      nameKanji: r.nameKanji,
      nameAtAis: r.nameAtAis,
      avatarUrl: r.avatarUrl,
      roles: r.roles,
    };
    if (canViewProfile(viewer, target, { follow: null, blocked: false }, now)) {
      out.push({ ...card, limited: false });
    } else if (isMinor(target, now) && exactNameMatch(q, r)) {
      // Name + roles only; no photo and no profile link for hidden minors.
      out.push({ ...card, avatarUrl: null, limited: true });
    }
    if (out.length >= 10) break;
  }
  return out;
}

const LINK_SELECT = {
  id: true,
  familyId: true,
  parentId: true,
  childId: true,
  childName: true,
  initiatedBy: true,
  confirmedAt: true,
  confirmedBy: true,
  createdAt: true,
  parent: { select: PUBLIC_CARD_SELECT },
  child: { select: PUBLIC_CARD_SELECT },
} as const satisfies Prisma.FamilyLinkSelect;

export type FamilyLinkView = Prisma.FamilyLinkGetPayload<{
  select: typeof LINK_SELECT;
}>;

export async function loadFamily(me: CurrentUser) {
  const [members, links] = await Promise.all([
    me.familyId
      ? db.user.findMany({
          where: {
            familyId: me.familyId,
            id: { not: me.id },
            state: AccountState.ACTIVE,
          },
          orderBy: [{ nameRomaji: "asc" }, { id: "asc" }],
          select: PUBLIC_CARD_SELECT,
        })
      : Promise.resolve([]),
    db.familyLink.findMany({
      where: {
        OR: [
          { parentId: me.id },
          { childId: me.id },
          ...(me.familyId
            ? [{ familyId: me.familyId, confirmedAt: { not: null } }]
            : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      select: LINK_SELECT,
    }),
  ]);
  return { members, links };
}

// ---------------------------------------------------------------- mutations

export type CreateLinkError =
  | "notAllowed"
  | "notFound"
  | "wrongRole"
  | "already"
  | "tooMany";

async function ensureFamily(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<string> {
  const u = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { familyId: true },
  });
  if (u.familyId) return u.familyId;
  const f = await tx.family.create({ data: {} });
  await tx.user.update({ where: { id: userId }, data: { familyId: f.id } });
  return f.id;
}

/**
 * Open a parent↔child link. The initiator is placed in a family (created if
 * needed) so the pending link has a familyId; families are merged on confirm.
 */
export async function createFamilyLink(
  me: CurrentUser,
  input:
    | { direction: Direction; otherId: string }
    | { direction: "child"; childName: string },
): Promise<
  { ok: true; linkId: string } | { ok: false; error: CreateLinkError }
> {
  const myRoles = me.roles.map((r) => r.role);
  if (!canClaim(myRoles, input.direction))
    return { ok: false, error: "notAllowed" };

  const pending = await db.familyLink.count({
    where: {
      confirmedAt: null,
      OR: [
        { parentId: me.id, initiatedBy: FamilyLinkInitiator.PARENT },
        { childId: me.id, initiatedBy: FamilyLinkInitiator.CHILD },
      ],
    },
  });
  if (pending >= MAX_PENDING_LINKS) return { ok: false, error: "tooMany" };

  if ("childName" in input) {
    const link = await db.$transaction(async (tx) => {
      const familyId = await ensureFamily(tx, me.id);
      return tx.familyLink.create({
        data: {
          familyId,
          parentId: me.id,
          childId: null,
          childName: input.childName,
          initiatedBy: FamilyLinkInitiator.PARENT,
        },
        select: { id: true },
      });
    });
    return { ok: true, linkId: link.id };
  }

  if (input.otherId === me.id) return { ok: false, error: "notAllowed" };
  const other = await db.user.findUnique({
    where: { id: input.otherId },
    include: { roles: true },
  });
  if (!other || other.state !== AccountState.ACTIVE)
    return { ok: false, error: "notFound" };
  const rel = await loadRelationship(me.id, other.id);
  if (rel.blocked) return { ok: false, error: "notFound" };
  const otherRoles = other.roles.map((r) => r.role);
  const needed = input.direction === "child" ? CHILD_ROLES : PARENT_ROLES;
  if (!hasAnyRole(otherRoles, needed)) return { ok: false, error: "wrongRole" };

  const parentId = input.direction === "child" ? me.id : other.id;
  const childId = input.direction === "child" ? other.id : me.id;
  const existing = await db.familyLink.findFirst({
    where: { parentId, childId },
    select: { id: true },
  });
  if (existing) return { ok: false, error: "already" };

  const link = await db.$transaction(async (tx) => {
    const familyId = await ensureFamily(tx, me.id);
    return tx.familyLink.create({
      data: {
        familyId,
        parentId,
        childId,
        childName: null,
        initiatedBy:
          input.direction === "child"
            ? FamilyLinkInitiator.PARENT
            : FamilyLinkInitiator.CHILD,
      },
      select: { id: true },
    });
  });

  try {
    const to = await db.user.findUniqueOrThrow({
      where: { id: other.id },
      select: NOTIFY_USER_SELECT,
    });
    await notify(to, {
      kind: "FAMILY_LINK_REQUEST",
      refId: link.id,
      render: async (locale) => {
        const t = await getTranslatorFor(locale as AppLocale, "family");
        const name = displayName(me, locale);
        const key = input.direction === "child" ? "asChild" : "asParent";
        return {
          subject: t(`notify.${key}Subject`, { name }),
          text: t(`notify.${key}Text`, { name }),
          url: appUrl(`/${locale}/app/family`),
        };
      },
    });
  } catch (e) {
    console.error("[family] notification failed", e);
  }

  return { ok: true, linkId: link.id };
}

/**
 * Confirm a pending link addressed to me and unite both users' families.
 * Parent-confirmed CURRENT_STUDENT links double as the parent confirmation
 * signal shown to admins (§8); nothing extra is stored for that.
 */
export async function confirmFamilyLink(
  me: CurrentUser,
  linkId: string,
  now: Date = new Date(),
): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const link = await tx.familyLink.findUnique({ where: { id: linkId } });
    if (!link || !link.childId || !canConfirm(me.id, link)) return false;
    const [parent, child] = await Promise.all([
      tx.user.findUniqueOrThrow({
        where: { id: link.parentId },
        select: { id: true, familyId: true },
      }),
      tx.user.findUniqueOrThrow({
        where: { id: link.childId },
        select: { id: true, familyId: true },
      }),
    ]);
    const plan = planFamilyMerge(parent.familyId, child.familyId);
    let familyId: string;
    switch (plan.kind) {
      case "create": {
        familyId = (await tx.family.create({ data: {} })).id;
        await tx.user.updateMany({
          where: { id: { in: [parent.id, child.id] } },
          data: { familyId },
        });
        break;
      }
      case "none":
        familyId = plan.familyId;
        break;
      case "join":
        familyId = plan.familyId;
        await tx.user.update({
          where: { id: plan.joiner === "parent" ? parent.id : child.id },
          data: { familyId },
        });
        break;
      case "merge":
        familyId = plan.into;
        await tx.user.updateMany({
          where: { familyId: plan.from },
          data: { familyId: plan.into },
        });
        // Move links before deleting: FamilyLink cascades on Family delete.
        await tx.familyLink.updateMany({
          where: { familyId: plan.from },
          data: { familyId: plan.into },
        });
        await tx.family.delete({ where: { id: plan.from } });
        break;
    }
    await tx.familyLink.update({
      where: { id: link.id },
      data: { confirmedAt: now, confirmedBy: me.id, familyId },
    });
    return true;
  });
}

/** Decline a link addressed to me, or withdraw one I started. Pending only. */
export async function removePendingFamilyLink(me: CurrentUser, linkId: string) {
  await db.familyLink.deleteMany({
    where: {
      id: linkId,
      confirmedAt: null,
      OR: [{ parentId: me.id }, { childId: me.id }],
    },
  });
}
