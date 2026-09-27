"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import {
  AccountState,
  OtpPurpose,
  RoleKey,
  VerificationStatus,
} from "@/generated/prisma/enums";
import { redirect } from "@/i18n/navigation";
import { issueOtp, normalizeEmail, verifyOtp } from "@/lib/auth/otp";
import { ensureCohort } from "@/lib/cohorts-db";
import { db } from "@/lib/db";
import {
  parentRole,
  studentRoleFields,
  teacherFields,
} from "@/lib/member-status";
import {
  childrenCurrent,
  findManagedMatches,
  findRegisteredChildren,
  notifyChildConfirmations,
  type ParentOutcome,
  type RegisteredChild,
  saveParentChildren,
  settleParentFromChildren,
} from "@/lib/parent-onboarding";
import { AuthError, actionUser, type CurrentUser } from "@/lib/session";
import { assertTransition } from "@/lib/state-machine";
import { deletePrivate, putPrivate } from "@/lib/storage";
import { notifyParentOutcomes } from "@/lib/verification/decision-notify";
import {
  evidenceAcceptable,
  isEvidenceType,
  isOwnEvidenceKey,
  safeFileName,
  sniffMatches,
  statEvidence,
} from "@/lib/verification/evidence";
import { computeRosterMatch } from "@/lib/verification/match";
import {
  EVIDENCE_MAX_BYTES,
  type EvidenceItem,
  issuesToErrors,
  type StoredAnswers,
  type VerificationData,
  verificationSchema,
} from "@/lib/verification/schema";
import { createVouchesForRequest } from "@/lib/verification/vouch";

const APPLICANT_STATES = [
  AccountState.EMAIL_VERIFIED,
  AccountState.NEEDS_INFO,
] as const;

async function applicant(): Promise<CurrentUser | null> {
  try {
    return await actionUser(...APPLICANT_STATES);
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Submit (§6.1–§6.4)

export type SubmitVerificationState = {
  ok: false;
  message: "validation" | "forbidden" | "generic" | "evidence";
  errors?: Record<string, string>;
} | null;

const localeSchema = z.enum(["ja", "en"]);

export async function submitVerificationAction(
  _prev: SubmitVerificationState,
  formData: FormData,
): Promise<SubmitVerificationState> {
  const user = await applicant();
  if (!user) return { ok: false, message: "forbidden" };

  const uiLocale = localeSchema.safeParse(formData.get("uiLocale"));
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { ok: false, message: "validation" };
  }
  const parsed = verificationSchema({
    // Kanji/kana is required when the applicant uses the Japanese UI (§6.1).
    requireKanji: (uiLocale.success ? uiLocale.data : user.locale) === "ja",
  }).safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "validation",
      errors: issuesToErrors(parsed.error.issues),
    };
  }
  const data = parsed.data;

  const existing = await db.verificationRequest.findUnique({
    where: { userId: user.id },
    select: { id: true, evidence: { select: { id: true, storageKey: true } } },
  });

  // Evidence: keys must be under this user's prefix and actually stored.
  const keptKeys = new Set(existing?.evidence.map((e) => e.storageKey) ?? []);
  const newEvidence: EvidenceItem[] = [];
  const keptKinds = new Map<string, EvidenceItem["kind"]>();
  const seen = new Set<string>();
  for (const item of data.evidence) {
    if (seen.has(item.key)) continue;
    seen.add(item.key);
    if (!isOwnEvidenceKey(user.id, item.key)) {
      return {
        ok: false,
        message: "evidence",
        errors: { evidence: "evidenceInvalid" },
      };
    }
    if (keptKeys.has(item.key)) {
      keptKinds.set(item.key, item.kind);
      continue;
    }
    const stat = await statEvidence(item.key);
    if (!stat || !evidenceAcceptable(stat)) {
      return {
        ok: false,
        message: "evidence",
        errors: { evidence: "evidenceInvalid" },
      };
    }
    newEvidence.push({
      ...item,
      size: stat.size || item.size,
      mimeType: isEvidenceType(stat.contentType)
        ? stat.contentType
        : item.mimeType,
    });
  }
  const removedEvidence = (existing?.evidence ?? []).filter(
    (e) => !seen.has(e.storageKey),
  );

  const roster = await computeRosterMatch(data);
  const schoolEmailVerified = await isSchoolEmailVerified(user, data);

  let requestId: string;
  let childLinksToConfirm: string[] = [];
  let settled: ParentOutcome | null = null;
  try {
    assertTransition(user.state, AccountState.PENDING_REVIEW);
    requestId = await db.$transaction(async (tx) => {
      // Guard against a concurrent state change (double submit, admin action).
      const moved = await tx.user.updateMany({
        where: { id: user.id, state: user.state },
        data: {
          lastNameRomaji: data.lastNameRomaji,
          firstNameRomaji: data.firstNameRomaji,
          middleNameRomaji: data.middleNameRomaji,
          lastNameKanji: data.lastNameKanji,
          firstNameKanji: data.firstNameKanji,
          lastNameKana: data.lastNameKana,
          firstNameKana: data.firstNameKana,
          nameKana: data.nameKana,
          nameRomaji: data.nameRomaji,
          nameKanji: data.nameKanji,
          nameAtAis: data.nameAtAis,
          dateOfBirth: new Date(`${data.dateOfBirth}T00:00:00Z`),
          locale: data.locale,
          state: AccountState.PENDING_REVIEW,
        },
      });
      if (moved.count !== 1) throw new Error("state changed");

      await saveRoles(tx, user, data, schoolEmailVerified);

      const answers: StoredAnswers = { version: 2, ...omitEvidence(data) };
      // Parents alone aren't reviewed: they follow their children's approval.
      const followsChildren = data.types.every((x) => x === "PARENT");
      const request = await tx.verificationRequest.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          answers: answers as Prisma.InputJsonValue,
          rosterScore: roster?.score ?? null,
          rosterRowId: roster?.rowId ?? null,
          followsChildren,
        },
        // Resubmission after NEEDS_INFO keeps the original submittedAt so the
        // queue stays first-come-first-served; reviewNote is kept for context.
        update: {
          answers: answers as Prisma.InputJsonValue,
          rosterScore: roster?.score ?? null,
          rosterRowId: roster?.rowId ?? null,
          status: VerificationStatus.PENDING,
          decidedAt: null,
          reviewerId: null,
          followsChildren,
        },
        select: { id: true },
      });

      if (removedEvidence.length) {
        await tx.verificationEvidence.deleteMany({
          where: { id: { in: removedEvidence.map((e) => e.id) } },
        });
      }
      // Files kept from an earlier submission may have changed type.
      for (const [storageKey, kind] of keptKinds) {
        await tx.verificationEvidence.updateMany({
          where: { requestId: request.id, storageKey },
          data: { kind },
        });
      }
      if (newEvidence.length) {
        await tx.verificationEvidence.createMany({
          data: newEvidence.map((e) => ({
            kind: e.kind,
            requestId: request.id,
            storageKey: e.key,
            fileName: e.fileName,
            mimeType: e.mimeType,
            size: e.size,
          })),
        });
      }

      childLinksToConfirm = data.parent
        ? await saveParentChildren(tx, user, data.parent.children, data.locale)
        : [];
      // A child approved earlier may already let the parent in.
      settled = await settleParentFromChildren(tx, user.id);
      return request.id;
    });
  } catch (e) {
    console.error("[verify] submit failed", e);
    return { ok: false, message: "generic" };
  }

  for (const e of removedEvidence) {
    await deletePrivate(e.storageKey).catch((err) =>
      console.error(`[verify] delete ${e.storageKey} failed`, err),
    );
  }
  // Vouch requests (§6.4.2) are best-effort; a failure must not undo the submission.
  // Registered children are asked to confirm the parent (best-effort).
  await notifyChildConfirmations(user, childLinksToConfirm);
  if (settled) await notifyParentOutcomes([settled]);
  await createVouchesForRequest(requestId).catch((e) =>
    console.error("[verify] vouches failed", e),
  );

  return redirect({
    href: "/app/onboarding/status",
    locale: uiLocale.success ? uiLocale.data : data.locale,
  });
}

function omitEvidence(
  data: VerificationData,
): Omit<VerificationData, "evidence"> {
  const { evidence: _evidence, ...rest } = data;
  return rest;
}

async function isSchoolEmailVerified(
  user: CurrentUser,
  data: VerificationData,
): Promise<boolean> {
  const email = data.teacher?.schoolEmail;
  if (!email) return false;
  const role = user.roles.find((r) => r.role === RoleKey.TEACHER);
  if (role?.schoolEmailVerified && role.schoolEmail === email) return true;
  // A consumed SCHOOL_EMAIL code for this user + address proves ownership.
  const otp = await db.otpCode.findFirst({
    where: {
      email: normalizeEmail(email),
      purpose: OtpPurpose.SCHOOL_EMAIL,
      userId: user.id,
      consumedAt: { not: null },
    },
    select: { id: true },
  });
  return otp !== null;
}

/**
 * Roles from the chosen types. Current vs former (and grade, graduation,
 * last division) are derived from the 学年 and years (src/lib/school.ts),
 * never picked by hand.
 */
async function saveRoles(
  tx: Prisma.TransactionClient,
  user: CurrentUser,
  data: VerificationData,
  schoolEmailVerified: boolean,
): Promise<void> {
  const now = new Date();
  const keep: RoleKey[] = [];
  const cohortEnd = async (n: number) => {
    const id = await ensureCohort(n, tx);
    const row = await tx.cohort.findUniqueOrThrow({
      where: { id },
      select: { elementaryEndYear: true },
    });
    return { id, end: row.elementaryEndYear };
  };
  const upsert = async (
    role: RoleKey,
    fields: Omit<Prisma.UserRoleUncheckedCreateInput, "userId" | "role">,
  ) => {
    keep.push(role);
    await tx.userRole.upsert({
      where: { userId_role: { userId: user.id, role } },
      create: { userId: user.id, role, ...fields },
      update: fields,
    });
  };

  if (data.student) {
    const st = data.student;
    const c = await cohortEnd(st.cohortNumber);
    const { role, ...fields } = studentRoleFields(
      c.end,
      st.joinedYear,
      st.leftYear,
      now,
    );
    await upsert(role, {
      ...fields,
      cohortId: c.id,
      studentIdNo: st.studentIdNo,
    });
  }
  if (data.teacher) {
    const t = data.teacher;
    await upsert(RoleKey.TEACHER, {
      ...teacherFields(t.joinedYear, t.leftYear, now),
      subjects: t.subjects,
      schoolEmail: t.schoolEmail,
      schoolEmailVerified,
    });
  }
  if (data.parent) {
    await upsert(
      parentRole(await childrenCurrent(tx, data.parent.children, now)),
      {},
    );
  }
  // Applicants are never ACTIVE here, so dropping other roles is safe.
  await tx.userRole.deleteMany({
    where: { userId: user.id, role: { notIn: keep } },
  });
}

// ---------------------------------------------------------------------------
// Evidence upload without Vercel Blob (local dev fallback, §6.3)

export type UploadEvidenceResult =
  | { ok: true; item: EvidenceItem }
  | { ok: false; error: "forbidden" | "type" | "size" | "generic" };

export async function uploadEvidenceAction(
  formData: FormData,
): Promise<UploadEvidenceResult> {
  const user = await applicant();
  if (!user) return { ok: false, error: "forbidden" };
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "generic" };
  if (!isEvidenceType(file.type)) return { ok: false, error: "type" };
  if (file.size <= 0 || file.size > EVIDENCE_MAX_BYTES)
    return { ok: false, error: "size" };
  const buf = Buffer.from(await file.arrayBuffer());
  if (!sniffMatches(buf.subarray(0, 8), file.type))
    return { ok: false, error: "type" };
  try {
    const key = await putPrivate(
      `evidence/${user.id}/${randomUUID()}-${safeFileName(file.name)}`,
      buf,
      file.type,
    );
    return {
      ok: true,
      item: {
        kind: formData.get("kind") === "DIPLOMA" ? "DIPLOMA" : "OTHER",
        key,
        fileName: file.name.slice(0, 200) || "file",
        mimeType: file.type,
        size: file.size,
      },
    };
  } catch (e) {
    console.error("[verify] upload failed", e);
    return { ok: false, error: "generic" };
  }
}

/** Remove an uploaded-but-not-yet-submitted file (or one being replaced). */
export async function discardEvidenceAction(key: string): Promise<void> {
  const user = await applicant();
  if (!user || typeof key !== "string" || !isOwnEvidenceKey(user.id, key))
    return;
  // Files already attached to the request are removed on resubmission instead.
  const attached = await db.verificationEvidence.findFirst({
    where: { storageKey: key },
    select: { id: true },
  });
  if (attached) return;
  await deletePrivate(key).catch(() => undefined);
}

// ---------------------------------------------------------------------------
// Teacher school email (§6.2). Assumption: any address is accepted; admins see
// the address and a "verified" badge and judge the domain themselves.

export type SchoolEmailResult = {
  ok: boolean;
  error?:
    | "forbidden"
    | "invalidEmail"
    | "rateLimited"
    | "sendFailed"
    | "invalid"
    | "expired"
    | "tooManyAttempts";
};

const emailSchema = z.email().max(254);

export async function sendSchoolEmailCodeAction(
  email: string,
): Promise<SchoolEmailResult> {
  const user = await applicant();
  if (!user) return { ok: false, error: "forbidden" };
  const parsed = emailSchema.safeParse(
    typeof email === "string" ? email.trim() : "",
  );
  if (!parsed.success) return { ok: false, error: "invalidEmail" };
  const res = await issueOtp({
    email: parsed.data,
    purpose: OtpPurpose.SCHOOL_EMAIL,
    locale: user.locale,
    userId: user.id,
  });
  if (res.ok) return { ok: true };
  return {
    ok: false,
    error: res.error === "send_failed" ? "sendFailed" : "rateLimited",
  };
}

export async function verifySchoolEmailCodeAction(
  email: string,
  code: string,
): Promise<SchoolEmailResult> {
  const user = await applicant();
  if (!user) return { ok: false, error: "forbidden" };
  const e = emailSchema.safeParse(
    typeof email === "string" ? email.trim() : "",
  );
  const c = z
    .string()
    .trim()
    .regex(/^\d{6}$/)
    .safeParse(code);
  if (!e.success) return { ok: false, error: "invalidEmail" };
  if (!c.success) return { ok: false, error: "invalid" };
  // Success is recorded by the consumed OtpCode row; the submit action reads it
  // to set UserRole.schoolEmailVerified.
  const res = await verifyOtp({
    email: e.data,
    purpose: OtpPurpose.SCHOOL_EMAIL,
    code: c.data,
    userId: user.id,
  });
  if (res.ok) return { ok: true };
  return {
    ok: false,
    error: res.error === "too_many_attempts" ? "tooManyAttempts" : res.error,
  };
}

// ---------------------------------------------------------------------------
// Parents: find a child who is already registered (exact name + birth date)

export async function searchRegisteredChildAction(input: {
  name: string;
  dateOfBirth: string;
}): Promise<RegisteredChild[]> {
  const user = await applicant();
  if (!user) return [];
  const name = String(input?.name ?? "").slice(0, 100);
  const dateOfBirth = String(input?.dateOfBirth ?? "").slice(0, 10);
  const locale = user.locale === "en" ? "en" : "ja";
  return findRegisteredChildren({ name, dateOfBirth }, user.id, locale);
}

// ---------------------------------------------------------------------------
// Students: were they already registered by a parent? (exact name + birth date)

export async function checkManagedDuplicateAction(input: {
  lastNameRomaji: string;
  firstNameRomaji: string;
  lastNameKanji: string;
  firstNameKanji: string;
  dateOfBirth: string;
}): Promise<boolean> {
  const user = await applicant();
  if (!user) return false;
  const s = (v: unknown) => String(v ?? "").slice(0, 60);
  const matches = await findManagedMatches(
    {
      names: [
        `${s(input.firstNameRomaji)} ${s(input.lastNameRomaji)}`,
        `${s(input.lastNameKanji)}${s(input.firstNameKanji)}`,
      ],
      dateOfBirth: s(input.dateOfBirth),
    },
    user.id,
  );
  return matches.length > 0;
}
