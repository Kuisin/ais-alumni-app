import type { Prisma } from "@/generated/prisma/client";
import {
  AccountState,
  FamilyLinkInitiator,
  RoleKey,
} from "@/generated/prisma/enums";
import type { AppLocale } from "@/i18n/routing";
import { getTranslatorFor } from "@/i18n/translator";
import { cohortShort } from "@/lib/cohorts";
import { ensureCohort } from "@/lib/cohorts-db";
import { db } from "@/lib/db";
import { confirmLinkInTx, exactNameMatch, normalizeName } from "@/lib/family";
import { displayName } from "@/lib/format";
import { childIsCurrent, studentRoleFields } from "@/lib/member-status";
import { nameColumns } from "@/lib/names";
import { NOTIFY_USER_SELECT, notify } from "@/lib/notify";
import type { CurrentUser } from "@/lib/session";
import { syncMemberStatus } from "@/lib/status-sync";
import { appUrl } from "@/lib/urls";
import type { ChildData } from "@/lib/verification/schema";

/**
 * Parents at sign-up (§6.2, §8). Each child is either
 *  - already registered: found by exact name + birth date (no browsing of
 *    members by applicants) and linked; the child confirms the link, or —
 *    when the child's account is managed by another parent — the admin's
 *    approval does; or
 *  - new: the parent enters the child's details and a child account managed
 *    by the parent is created (no sign-in of its own, PENDING_REVIEW).
 * The admin reviews the children's details; approving the parent's
 * application also approves the child accounts they created and confirms
 * those links (settleManagedChildren).
 */

type Tx = Prisma.TransactionClient;

const STUDENT_ROLES = [RoleKey.CURRENT_STUDENT, RoleKey.FORMER_STUDENT];

export type RegisteredChild = {
  id: string;
  name: string;
  cohort: string | null;
};

/** Registered students with exactly this name and birth date (max 3). */
export async function findRegisteredChildren(
  q: { name: string; dateOfBirth: string },
  excludeUserId: string,
  locale: "ja" | "en",
): Promise<RegisteredChild[]> {
  const name = normalizeName(q.name);
  if (name.length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(q.dateOfBirth)) return [];
  const dob = new Date(`${q.dateOfBirth}T00:00:00Z`);
  if (Number.isNaN(dob.getTime())) return [];
  const candidates = await db.user.findMany({
    where: {
      id: { not: excludeUserId },
      dateOfBirth: dob,
      state: { in: [AccountState.ACTIVE, AccountState.PENDING_REVIEW] },
      roles: { some: { role: { in: STUDENT_ROLES } } },
    },
    select: {
      id: true,
      nameRomaji: true,
      nameKanji: true,
      nameAtAis: true,
      roles: {
        where: { role: { in: STUDENT_ROLES } },
        select: { cohort: { select: { number: true } } },
      },
    },
    take: 50,
  });
  return candidates
    .filter((u) => exactNameMatch(q.name, u))
    .slice(0, 3)
    .map((u) => {
      const n = u.roles.find((r) => r.cohort)?.cohort?.number;
      return {
        id: u.id,
        name: displayName(u, locale),
        cohort: n ? cohortShort({ number: n }, locale) : null,
      };
    });
}

type ChildRole = { end: number; leftYear: number | null } | null;

/** A registered child's student record (学年 end year and leave year). */
async function registeredChildRole(
  tx: Tx,
  childId: string,
): Promise<ChildRole> {
  const r = await tx.userRole.findFirst({
    where: {
      userId: childId,
      role: { in: STUDENT_ROLES },
      cohortId: { not: null },
    },
    select: { yearsTo: true, cohort: { select: { elementaryEndYear: true } } },
  });
  return r?.cohort
    ? { end: r.cohort.elementaryEndYear, leftYear: r.yearsTo }
    : null;
}

/** Whether each child is a current student (for the parent's own role). */
export async function childrenCurrent(
  tx: Tx,
  children: readonly ChildData[],
  now: Date = new Date(),
): Promise<boolean[]> {
  const out: boolean[] = [];
  for (const c of children) {
    if (c.mode === "new") {
      const id = await ensureCohort(c.cohortNumber, tx);
      const { elementaryEndYear } = await tx.cohort.findUniqueOrThrow({
        where: { id },
        select: { elementaryEndYear: true },
      });
      out.push(childIsCurrent(elementaryEndYear, c.leftYear, now));
    } else {
      const r = await registeredChildRole(tx, c.existingUserId);
      if (r) out.push(childIsCurrent(r.end, r.leftYear, now));
    }
  }
  return out;
}

const dayKey = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

/**
 * Save the children of a parent's application (also on resubmission).
 * Returns links to registered children that the child must confirm.
 */
export async function saveParentChildren(
  tx: Tx,
  parent: CurrentUser,
  children: readonly ChildData[],
  locale: "ja" | "en",
  now: Date = new Date(),
): Promise<string[]> {
  let familyId = parent.familyId;
  if (!familyId) {
    familyId = (await tx.family.create({ data: {} })).id;
    await tx.user.update({ where: { id: parent.id }, data: { familyId } });
  }

  const managed = await tx.user.findMany({
    where: { managedById: parent.id, state: AccountState.PENDING_REVIEW },
    select: { id: true, nameRomaji: true, dateOfBirth: true },
  });
  const managedKey = (name: string | null, dob: Date | null) =>
    `${normalizeName(name ?? "")}|${dayKey(dob)}`;
  const managedByKey = new Map(
    managed.map((m) => [managedKey(m.nameRomaji, m.dateOfBirth), m.id]),
  );

  const keptChildIds = new Set<string>();
  const toConfirm: string[] = [];

  for (const c of children) {
    let childId: string;
    let childName: string;
    let childCohortId: string | null = null;
    let childLeftYear: number | null = null;

    if (c.mode === "new") {
      const cols = nameColumns({
        lastNameRomaji: c.lastNameRomaji,
        firstNameRomaji: c.firstNameRomaji,
        middleNameRomaji: null,
        lastNameKanji: c.lastNameKanji,
        firstNameKanji: c.firstNameKanji,
      });
      const dob = new Date(`${c.dateOfBirth}T00:00:00Z`);
      childCohortId = await ensureCohort(c.cohortNumber, tx);
      childLeftYear = c.leftYear;
      const existing = managedByKey.get(managedKey(cols.nameRomaji, dob));
      const data = { ...cols, dateOfBirth: dob, familyId, locale };
      childId = existing
        ? (
            await tx.user.update({
              where: { id: existing },
              data,
              select: { id: true },
            })
          ).id
        : (
            await tx.user.create({
              data: {
                ...data,
                state: AccountState.PENDING_REVIEW,
                managedById: parent.id,
              },
              select: { id: true },
            })
          ).id;
      const { elementaryEndYear } = await tx.cohort.findUniqueOrThrow({
        where: { id: childCohortId },
        select: { elementaryEndYear: true },
      });
      const { role, ...fields } = studentRoleFields(
        elementaryEndYear,
        c.joinedYear,
        c.leftYear,
        now,
      );
      await tx.userRole.deleteMany({
        where: { userId: childId, role: { in: STUDENT_ROLES, not: role } },
      });
      await tx.userRole.upsert({
        where: { userId_role: { userId: childId, role } },
        create: {
          userId: childId,
          role,
          ...fields,
          cohortId: childCohortId,
          studentIdNo: c.studentIdNo,
        },
        update: {
          ...fields,
          cohortId: childCohortId,
          studentIdNo: c.studentIdNo,
        },
      });
      childName = cols.nameKanji ?? cols.nameRomaji ?? c.lastNameRomaji;
    } else {
      const child = await tx.user.findFirst({
        where: {
          id: c.existingUserId,
          NOT: { id: parent.id },
          roles: { some: { role: { in: STUDENT_ROLES } } },
        },
        select: {
          id: true,
          roles: {
            where: { role: { in: STUDENT_ROLES } },
            select: { cohortId: true, yearsTo: true },
          },
        },
      });
      if (!child) continue; // no longer registered; the admin sees it's missing
      childId = child.id;
      childName = c.name;
      childCohortId = child.roles[0]?.cohortId ?? null;
      childLeftYear = child.roles[0]?.yearsTo ?? null;
    }

    keptChildIds.add(childId);
    const link = await tx.familyLink.findFirst({
      where: { parentId: parent.id, childId },
      select: { id: true, confirmedAt: true },
    });
    if (link) {
      await tx.familyLink.update({
        where: { id: link.id },
        data: { childName, childCohortId, childLeftYear },
      });
    } else {
      const created = await tx.familyLink.create({
        data: {
          familyId,
          parentId: parent.id,
          childId,
          childName,
          childCohortId,
          childLeftYear,
          initiatedBy: FamilyLinkInitiator.PARENT,
        },
        select: { id: true },
      });
      if (c.mode === "existing") toConfirm.push(created.id);
    }
  }

  // Resubmission: drop children the parent removed (only what the
  // application itself created and nobody has confirmed).
  await tx.familyLink.deleteMany({
    where: {
      parentId: parent.id,
      confirmedAt: null,
      OR: [{ childId: null }, { childId: { notIn: [...keptChildIds] } }],
    },
  });
  await tx.user.deleteMany({
    where: {
      managedById: parent.id,
      state: AccountState.PENDING_REVIEW,
      id: { notIn: [...keptChildIds] },
    },
  });
  return toConfirm;
}

/** Ask registered children to confirm the parent's link (best-effort). */
export async function notifyChildConfirmations(
  parent: CurrentUser,
  linkIds: readonly string[],
): Promise<void> {
  for (const linkId of linkIds) {
    try {
      const link = await db.familyLink.findUnique({
        where: { id: linkId },
        select: {
          child: {
            select: {
              ...NOTIFY_USER_SELECT,
              managedBy: { select: NOTIFY_USER_SELECT },
            },
          },
        },
      });
      // A managed child can't sign in: ask the parent who manages it.
      const to = link?.child?.managedBy ?? link?.child;
      if (!to) continue;
      await notify(to, {
        kind: "FAMILY_LINK_REQUEST",
        refId: linkId,
        render: async (locale) => {
          const t = await getTranslatorFor(locale as AppLocale, "family");
          const name = displayName(parent, locale);
          return {
            subject: t("notify.asChildSubject", { name }),
            text: t("notify.asChildText", { name }),
            url: appUrl(`/${locale}/app/family`),
          };
        },
      });
    } catch (e) {
      console.error("[parent-onboarding] notification failed", e);
    }
  }
}

/**
 * On the admin's decision about a parent's application: approve (or reject)
 * the child accounts the parent created, and on approval confirm the links
 * to managed children (theirs or another parent's). Links to children who
 * sign in themselves stay for the child to confirm.
 */
export async function settleManagedChildren(
  tx: Tx,
  parentId: string,
  decision: "APPROVE" | "REJECT" | "NEEDS_INFO",
  now: Date = new Date(),
): Promise<void> {
  if (decision === "NEEDS_INFO") return;
  const pending = await tx.user.findMany({
    where: { managedById: parentId, state: AccountState.PENDING_REVIEW },
    select: { id: true },
  });
  await tx.user.updateMany({
    where: { id: { in: pending.map((p) => p.id) } },
    data: {
      state:
        decision === "APPROVE" ? AccountState.ACTIVE : AccountState.REJECTED,
    },
  });
  if (decision !== "APPROVE") return;
  const links = await tx.familyLink.findMany({
    where: {
      parentId,
      confirmedAt: null,
      child: { managedById: { not: null } },
    },
    select: { id: true, parentId: true, childId: true },
  });
  for (const l of links) await confirmLinkInTx(tx, l, "ADMIN", now);
  for (const p of pending) await syncMemberStatus(p.id, tx, now);
  await syncMemberStatus(parentId, tx, now);
}
