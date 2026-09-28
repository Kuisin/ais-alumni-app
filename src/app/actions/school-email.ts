"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { OtpPurpose, RoleKey } from "@/generated/prisma/enums";
import { issueOtp, normalizeEmail, verifyOtp } from "@/lib/auth/otp";
import { db } from "@/lib/db";
import { isSchoolEmail } from "@/lib/school-email";
import { actionActive, type CurrentUser } from "@/lib/session";
import type { SchoolEmailResult } from "./verify";

/**
 * 設定 → 学校のメールアドレス（業務用）: approved teachers add or change
 * their @aisnagoya.net address, confirmed with a code, on their TEACHER
 * role. It is never used for sign-in or notifications.
 */

async function teacher(): Promise<CurrentUser | null> {
  const user = await actionActive().catch(() => null);
  return user?.roles.some((r) => r.role === RoleKey.TEACHER) ? user : null;
}

const emailSchema = z.email().max(254);

export async function sendMySchoolEmailCodeAction(
  email: string,
): Promise<SchoolEmailResult> {
  const user = await teacher();
  if (!user) return { ok: false, error: "forbidden" };
  const parsed = emailSchema.safeParse(
    typeof email === "string" ? email.trim() : "",
  );
  if (!parsed.success) return { ok: false, error: "invalidEmail" };
  if (!isSchoolEmail(parsed.data)) return { ok: false, error: "wrongDomain" };
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

/** Confirm the code; the address is then saved as verified. */
export async function verifyMySchoolEmailCodeAction(
  email: string,
  code: string,
): Promise<SchoolEmailResult> {
  const user = await teacher();
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
  if (!isSchoolEmail(e.data)) return { ok: false, error: "wrongDomain" };
  if (!c.success) return { ok: false, error: "invalid" };
  const res = await verifyOtp({
    email: e.data,
    purpose: OtpPurpose.SCHOOL_EMAIL,
    code: c.data,
    userId: user.id,
  });
  if (!res.ok)
    return {
      ok: false,
      error: res.error === "too_many_attempts" ? "tooManyAttempts" : res.error,
    };
  await db.userRole.updateMany({
    where: { userId: user.id, role: RoleKey.TEACHER },
    data: { schoolEmail: normalizeEmail(e.data), schoolEmailVerified: true },
  });
  refresh();
  return { ok: true };
}

/** Remove the school address. */
export async function removeMySchoolEmailAction(): Promise<void> {
  const user = await teacher();
  if (!user) return;
  await db.userRole.updateMany({
    where: { userId: user.id, role: RoleKey.TEACHER },
    data: { schoolEmail: null, schoolEmailVerified: false },
  });
  refresh();
}
