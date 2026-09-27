"use server";

import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { AccountState, LifeStage, RoleKey } from "@/generated/prisma/enums";
import { redirect } from "@/i18n/navigation";
import { getTranslatorFor } from "@/i18n/translator";
import { canRevokeAdmin } from "@/lib/account";
import { audit } from "@/lib/audit";
import { normalizeEmail } from "@/lib/auth/otp";
import { parseCohortNumber } from "@/lib/cohorts";
import { ensureCohort } from "@/lib/cohorts-db";
import { db } from "@/lib/db";
import { MergeKeepsManagedError, mergeUsers } from "@/lib/merge";
import { nameColumns, nameFormInput, nameFormSchema } from "@/lib/names";
import { NOTIFY_USER_SELECT, notify } from "@/lib/notify";
import { AuthError, actionAdmin } from "@/lib/session";
import { canTransition } from "@/lib/state-machine";
import { syncMemberStatus } from "@/lib/status-sync";
import { appUrl } from "@/lib/urls";

export type MergeSide = {
  id: string;
  name: string;
  email: string | null;
  state: AccountState;
  roles: RoleKey[];
  providers: string[];
  lineLinked: boolean;
  isAdmin: boolean;
  createdAt: string;
};

export type AdminMemberFormState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** merge flow: both accounts shown for confirmation */
  preview?: { keep: MergeSide; duplicate: MergeSide };
};

async function errorText(e: unknown): Promise<string> {
  const t = await getTranslations("common");
  if (e instanceof AuthError) {
    return e.message === "unauthenticated"
      ? t("errors.unauthenticated")
      : t("errors.forbidden");
  }
  console.error("[admin-members]", e);
  return t("errors.generic");
}

const USER = { type: "User" } as const;
const id = z.string().min(1).max(64);

/** "" → null for optional text inputs. */
const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable();

const optInt = (min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null;
      const n = Number(v);
      if (!Number.isInteger(n) || n < min || n > max) {
        ctx.addIssue({ code: "custom", message: "range" });
        return z.NEVER;
      }
      return n;
    })
    .nullable();

const optEnum = <T extends Record<string, string>>(e: T) =>
  z
    .union([z.literal(""), z.enum(e)])
    .transform((v) => (v === "" ? null : (v as T[keyof T])))
    .nullable();

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  return typeof v === "string" ? v : null;
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const k = String(issue.path[0] ?? "_");
    out[k] ??= issue.message;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Profile fields
// ---------------------------------------------------------------------------

const profileSchema = nameFormSchema.extend({
  userId: id,
  nameAtAis: optText(100),
  dateOfBirth: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "date")
    .transform((v) => (v === "" ? null : new Date(`${v}T00:00:00Z`)))
    .nullable(),
  bio: optText(2000),
  phone: optText(40),
});

export async function updateMemberProfileAction(
  _prev: AdminMemberFormState,
  fd: FormData,
): Promise<AdminMemberFormState> {
  const tc = await getTranslations("common");
  try {
    const admin = await actionAdmin();
    const parsed = profileSchema.safeParse({
      userId: str(fd, "userId"),
      ...nameFormInput(fd),
      nameAtAis: str(fd, "nameAtAis") ?? "",
      dateOfBirth: str(fd, "dateOfBirth") ?? "",
      bio: str(fd, "bio") ?? "",
      phone: str(fd, "phone") ?? "",
    });
    if (!parsed.success) {
      return {
        error: tc("errors.validation"),
        fieldErrors: fieldErrors(parsed.error),
      };
    }
    const { userId, ...rest } = parsed.data;
    const data = { ...rest, ...nameColumns(rest) };
    const before = await db.user.findUnique({
      where: { id: userId },
      select: {
        lastNameRomaji: true,
        firstNameRomaji: true,
        middleNameRomaji: true,
        lastNameKanji: true,
        firstNameKanji: true,
        nameRomaji: true,
        nameKanji: true,
        nameAtAis: true,
        dateOfBirth: true,
        bio: true,
        phone: true,
      },
    });
    if (!before) return { error: tc("errors.notFound") };
    await db.user.update({ where: { id: userId }, data });
    const changed = Object.fromEntries(
      Object.entries(data).filter(
        ([k, v]) =>
          String(before[k as keyof typeof before] ?? "") !== String(v ?? ""),
      ),
    );
    await audit(
      admin.id,
      "member.profile_updated",
      { ...USER, id: userId },
      {
        fields: Object.keys(changed),
      },
    );
    refresh();
    return { ok: true, message: tc("saved") };
  } catch (e) {
    return { error: await errorText(e) };
  }
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

const roleSchema = z.object({
  userId: id,
  role: z.enum(RoleKey),
  cohortNumber: z.string().transform((v, ctx) => {
    const n = parseCohortNumber(v);
    if (n === undefined) {
      ctx.addIssue({ code: "custom", message: "invalid" });
      return z.NEVER;
    }
    return n;
  }),
  yearsFrom: optInt(1950, 2100),
  yearsTo: optInt(1950, 2100),
  subjects: optText(200),
  schoolEmail: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : normalizeEmail(v)))
    .pipe(z.email().nullable())
    .nullable(),
  studentIdNo: optText(40),
  currentStage: optEnum(LifeStage),
  currentStageDetail: optText(200),
});

/**
 * Save a role's inputs (学年, joined / left years, …). Current vs former,
 * grade and graduation are recomputed by syncMemberStatus, so an admin never
 * sets them by hand. Adding "student" / "parent" creates the current role,
 * which the sync moves to former when appropriate.
 */
export async function saveMemberRoleAction(
  _prev: AdminMemberFormState,
  fd: FormData,
): Promise<AdminMemberFormState> {
  const tc = await getTranslations("common");
  try {
    const admin = await actionAdmin();
    const raw = (k: string) => str(fd, k) ?? "";
    const parsed = roleSchema.safeParse({
      userId: str(fd, "userId"),
      role: str(fd, "role"),
      cohortNumber: raw("cohortNumber"),
      yearsFrom: raw("yearsFrom"),
      yearsTo: raw("yearsTo"),
      subjects: raw("subjects"),
      schoolEmail: raw("schoolEmail"),
      studentIdNo: raw("studentIdNo"),
      currentStage: raw("currentStage"),
      currentStageDetail: raw("currentStageDetail"),
    });
    if (!parsed.success) {
      return {
        error: tc("errors.validation"),
        fieldErrors: fieldErrors(parsed.error),
      };
    }
    const d = parsed.data;
    if (d.yearsFrom !== null && d.yearsTo !== null && d.yearsTo < d.yearsFrom) {
      return {
        error: tc("errors.validation"),
        fieldErrors: { yearsTo: "yearsOrder" },
      };
    }
    const target = await db.user.findUnique({
      where: { id: d.userId },
      select: { id: true },
    });
    if (!target) return { error: tc("errors.notFound") };

    const isStudent =
      d.role === RoleKey.CURRENT_STUDENT || d.role === RoleKey.FORMER_STUDENT;
    const isTeacher = d.role === RoleKey.TEACHER;
    const existing = await db.userRole.findUnique({
      where: { userId_role: { userId: d.userId, role: d.role } },
    });
    let data: Prisma.UserRoleUncheckedUpdateInput = {};
    if (isStudent) {
      data = {
        // 学年 rows are created the first time someone is assigned to them.
        cohortId:
          d.cohortNumber !== null ? await ensureCohort(d.cohortNumber) : null,
        yearsFrom: d.yearsFrom,
        yearsTo: d.yearsTo,
        studentIdNo: d.studentIdNo,
        ...(d.role === RoleKey.FORMER_STUDENT
          ? {
              currentStage: d.currentStage,
              currentStageDetail: d.currentStageDetail,
              ...(existing?.currentStage !== d.currentStage
                ? { currentStageUpdatedAt: d.currentStage ? new Date() : null }
                : {}),
            }
          : {}),
      };
    } else if (isTeacher) {
      data = {
        yearsFrom: d.yearsFrom,
        yearsTo: d.yearsTo,
        subjects: d.subjects,
        schoolEmail: d.schoolEmail,
        // Assumption: an admin-edited school email is unverified unless unchanged.
        schoolEmailVerified:
          Boolean(existing?.schoolEmailVerified) &&
          existing?.schoolEmail === d.schoolEmail,
      };
    }
    await db.userRole.upsert({
      where: { userId_role: { userId: d.userId, role: d.role } },
      create: { userId: d.userId, role: d.role, ...(data as object) },
      update: data,
    });
    await syncMemberStatus(d.userId);
    await audit(
      admin.id,
      existing ? "member.role_updated" : "member.role_added",
      { ...USER, id: d.userId },
      { role: d.role },
    );
    refresh();
    return { ok: true, message: tc("saved") };
  } catch (e) {
    return { error: await errorText(e) };
  }
}

const removeRoleSchema = z.object({ userId: id, role: z.enum(RoleKey) });

export async function removeMemberRoleAction(
  _prev: AdminMemberFormState,
  fd: FormData,
): Promise<AdminMemberFormState> {
  const tc = await getTranslations("common");
  const t = await getTranslations("adminMembers");
  try {
    const admin = await actionAdmin();
    const parsed = removeRoleSchema.safeParse({
      userId: str(fd, "userId"),
      role: str(fd, "role"),
    });
    if (!parsed.success) return { error: tc("errors.validation") };
    const { userId, role } = parsed.data;
    const count = await db.userRole.count({ where: { userId } });
    if (count <= 1) return { error: t("roles.lastRole") };
    await db.userRole.deleteMany({ where: { userId, role } });
    await audit(
      admin.id,
      "member.role_removed",
      { ...USER, id: userId },
      { role },
    );
    refresh();
    return { ok: true, message: t("roles.removed") };
  } catch (e) {
    return { error: await errorText(e) };
  }
}

// ---------------------------------------------------------------------------
// Deactivate / reactivate
// ---------------------------------------------------------------------------

const stateSchema = z.object({
  userId: id,
  state: z.enum([AccountState.ACTIVE, AccountState.DEACTIVATED]),
});

async function activeAdminCount(): Promise<number> {
  return db.user.count({
    where: { isAdmin: true, state: AccountState.ACTIVE },
  });
}

export async function setMemberStateAction(
  _prev: AdminMemberFormState,
  fd: FormData,
): Promise<AdminMemberFormState> {
  const tc = await getTranslations("common");
  const t = await getTranslations("adminMembers");
  try {
    const admin = await actionAdmin();
    const parsed = stateSchema.safeParse({
      userId: str(fd, "userId"),
      state: str(fd, "state"),
    });
    if (!parsed.success) return { error: tc("errors.validation") };
    const { userId, state } = parsed.data;
    if (userId === admin.id) return { error: t("status.notSelf") };
    const target = await db.user.findUnique({
      where: { id: userId },
      select: { state: true, isAdmin: true },
    });
    if (!target) return { error: tc("errors.notFound") };
    if (!canTransition(target.state, state))
      return { error: t("status.invalidTransition") };
    if (
      state === AccountState.DEACTIVATED &&
      target.isAdmin &&
      !canRevokeAdmin({
        targetIsAdmin: true,
        adminCount: await activeAdminCount(),
      })
    ) {
      return { error: t("admin.lastAdmin") };
    }

    const deactivating = state === AccountState.DEACTIVATED;
    const updated = await db.user.update({
      where: { id: userId },
      data: { state, deactivatedAt: deactivating ? new Date() : null },
      select: NOTIFY_USER_SELECT,
    });
    await audit(
      admin.id,
      deactivating ? "member.deactivated" : "member.reactivated",
      { ...USER, id: userId },
      {
        from: target.state,
        to: state,
      },
    );
    await notify(updated, {
      kind: deactivating ? "DEACTIVATED" : "REACTIVATED",
      alwaysEmail: deactivating,
      render: async (locale) => {
        const tr = await getTranslatorFor(locale, "adminMembers");
        const key = deactivating ? "deactivated" : "reactivated";
        return {
          subject: tr(`notify.${key}.subject`),
          text: tr(`notify.${key}.text`),
          url: deactivating ? undefined : appUrl(`/${locale}/app/dashboard`),
        };
      },
    }).catch((e) => console.error("[admin-members] notify failed", e));
    refresh();
    return {
      ok: true,
      message: t(
        deactivating ? "status.deactivatedDone" : "status.reactivatedDone",
      ),
    };
  } catch (e) {
    return { error: await errorText(e) };
  }
}

// ---------------------------------------------------------------------------
// Admin rights
// ---------------------------------------------------------------------------

const adminSchema = z.object({ userId: id, grant: z.enum(["yes", "no"]) });

export async function setMemberAdminAction(
  _prev: AdminMemberFormState,
  fd: FormData,
): Promise<AdminMemberFormState> {
  const tc = await getTranslations("common");
  const t = await getTranslations("adminMembers");
  try {
    const admin = await actionAdmin();
    const parsed = adminSchema.safeParse({
      userId: str(fd, "userId"),
      grant: str(fd, "grant"),
    });
    if (!parsed.success) return { error: tc("errors.validation") };
    const { userId } = parsed.data;
    const grant = parsed.data.grant === "yes";
    const target = await db.user.findUnique({
      where: { id: userId },
      select: { state: true, isAdmin: true },
    });
    if (!target) return { error: tc("errors.notFound") };
    if (grant) {
      if (target.state !== AccountState.ACTIVE)
        return { error: t("admin.mustBeActive") };
      if (target.isAdmin) return { ok: true };
    } else {
      if (!target.isAdmin) return { ok: true };
      // Count only ACTIVE admins: a deactivated admin cannot act.
      const count =
        target.state === AccountState.ACTIVE
          ? await activeAdminCount()
          : Number.POSITIVE_INFINITY;
      if (!canRevokeAdmin({ targetIsAdmin: true, adminCount: count }))
        return { error: t("admin.lastAdmin") };
    }
    await db.user.update({ where: { id: userId }, data: { isAdmin: grant } });
    await audit(
      admin.id,
      grant ? "member.admin_granted" : "member.admin_revoked",
      { ...USER, id: userId },
    );
    if (!grant && userId === admin.id) {
      // Revoked own rights: leave the admin area.
      redirect({ href: "/app/dashboard", locale: await getLocale() });
    }
    refresh();
    return { ok: true, message: t(grant ? "admin.granted" : "admin.revoked") };
  } catch (e) {
    // redirect() throws a control-flow error that must propagate.
    unstable_rethrow(e);
    return { error: await errorText(e) };
  }
}

// ---------------------------------------------------------------------------
// Merge duplicate accounts (§3.2)
// ---------------------------------------------------------------------------

async function mergeSide(userId: string): Promise<MergeSide | null> {
  const u = await db.user.findUnique({
    where: { id: userId },
    include: {
      roles: { select: { role: true } },
      accounts: { select: { provider: true } },
    },
  });
  if (!u) return null;
  return {
    id: u.id,
    name: [u.nameRomaji, u.nameKanji].filter(Boolean).join(" / ") || "—",
    email: u.primaryEmail,
    state: u.state,
    roles: u.roles.map((r) => r.role),
    providers: u.accounts.map((a) => a.provider),
    lineLinked: Boolean(u.lineUserId),
    isAdmin: u.isAdmin,
    createdAt: u.createdAt.toISOString(),
  };
}

const previewSchema = z.object({
  userId: id,
  other: z.string().trim().min(1).max(254),
  keep: z.enum(["this", "other"]),
});
const confirmSchema = z.object({ keepId: id, duplicateId: id });

export async function mergeMembersAction(
  prev: AdminMemberFormState,
  fd: FormData,
): Promise<AdminMemberFormState> {
  const tc = await getTranslations("common");
  const t = await getTranslations("adminMembers");
  const intent = str(fd, "intent");
  let keepId: string;
  try {
    const admin = await actionAdmin();

    if (intent === "cancel") return {};

    if (intent === "preview") {
      const parsed = previewSchema.safeParse({
        userId: str(fd, "userId"),
        other: str(fd, "other"),
        keep: str(fd, "keep"),
      });
      if (!parsed.success) return { error: tc("errors.validation") };
      const { userId, other, keep } = parsed.data;
      const otherUser = await db.user.findFirst({
        where: other.includes("@")
          ? { primaryEmail: normalizeEmail(other) }
          : { id: other },
        select: { id: true },
      });
      if (!otherUser) return { error: t("merge.notFound") };
      if (otherUser.id === userId) return { error: t("merge.same") };
      const [a, b] = await Promise.all([
        mergeSide(userId),
        mergeSide(otherUser.id),
      ]);
      if (!a || !b) return { error: tc("errors.notFound") };
      const preview =
        keep === "this" ? { keep: a, duplicate: b } : { keep: b, duplicate: a };
      if (preview.duplicate.id === admin.id)
        return { error: t("merge.notSelf") };
      return { preview };
    }

    if (intent === "confirm") {
      const parsed = confirmSchema.safeParse({
        keepId: str(fd, "keepId"),
        duplicateId: str(fd, "duplicateId"),
      });
      if (!parsed.success || parsed.data.keepId === parsed.data.duplicateId) {
        return { ...prev, error: tc("errors.validation") };
      }
      const { duplicateId } = parsed.data;
      keepId = parsed.data.keepId;
      if (duplicateId === admin.id)
        return { ...prev, error: t("merge.notSelf") };
      const [keep, dup] = await Promise.all([
        db.user.findUnique({ where: { id: keepId } }),
        db.user.findUnique({ where: { id: duplicateId } }),
      ]);
      if (!keep || !dup) return { error: tc("errors.notFound") };

      try {
        await mergeUsers(duplicateId, keepId);
      } catch (e) {
        if (e instanceof MergeKeepsManagedError)
          return { ...prev, error: t("merge.keepsManaged") };
        throw e;
      }
      // mergeUsers leaves email/admin/notification settings on the kept
      // account; fill the email if the kept account had none, and keep admin
      // rights if either account had them.
      await db.user.update({
        where: { id: keepId },
        data: {
          ...(!keep.primaryEmail && dup.primaryEmail
            ? {
                primaryEmail: dup.primaryEmail,
                emailVerifiedAt: dup.emailVerifiedAt,
              }
            : {}),
          ...(dup.isAdmin && !keep.isAdmin ? { isAdmin: true } : {}),
        },
      });
      await audit(
        admin.id,
        "member.merged",
        { ...USER, id: keepId },
        {
          duplicateId,
          duplicateEmail: dup.primaryEmail,
          duplicateName: dup.nameRomaji,
        },
      );
    } else {
      return { ...prev, error: tc("errors.validation") };
    }
  } catch (e) {
    return { ...prev, error: await errorText(e) };
  }
  redirect({
    href: `/app/admin/members/${keepId}?merged=1`,
    locale: await getLocale(),
  });
  return {};
}
