"use server";

import { getLocale } from "next-intl/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { AccountState, OtpPurpose } from "@/generated/prisma/enums";
import { redirect } from "@/i18n/navigation";
import { audit } from "@/lib/audit";
import { issueOtp, normalizeEmail, verifyOtp } from "@/lib/auth/otp";
import { db } from "@/lib/db";
import { mergeUsers } from "@/lib/merge";
import { AuthError, actionUser } from "@/lib/session";
import { assertTransition, homePathFor } from "@/lib/state-machine";
import type { OtpFormState } from "./auth";

const emailSchema = z.object({ email: z.email().max(254) });
const codeSchema = z.object({
  email: z.email().max(254),
  code: z
    .string()
    .transform((s) => s.replace(/\s/g, ""))
    .pipe(z.string().regex(/^\d{6}$/)),
});
const intentSchema = z.enum(["request", "resend", "verify", "change"]);

async function go(href: string): Promise<never> {
  const locale = await getLocale();
  return redirect({ href, locale });
}

async function requestCode(
  userId: string,
  locale: "ja" | "en",
  formData: FormData,
  resend: boolean,
): Promise<OtpFormState> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { step: "email", error: "invalid_email" };
  const email = normalizeEmail(parsed.data.email);
  const result = await issueOtp({
    email,
    purpose: OtpPurpose.VERIFY_EMAIL,
    locale,
    userId,
  });
  if (!result.ok) {
    return result.error === "send_failed"
      ? { step: "email", email, error: "send_failed" }
      : { step: "code", email, error: "rate_limited" };
  }
  return { step: "code", email, notice: resend ? "resent" : "sent" };
}

/**
 * Confirm the email of a LINE-first account (§4.2). If the address already
 * belongs to another member, this LINE account is merged into it (§4.3) and
 * the live session follows via UserMerge; otherwise the address is attached
 * and the account moves to EMAIL_VERIFIED.
 */
async function confirmCode(
  user: { id: string; state: AccountState; lineFollowing: boolean },
  formData: FormData,
): Promise<OtpFormState> {
  const raw = formData.get("email");
  const shownEmail = typeof raw === "string" ? raw : "";
  const parsed = codeSchema.safeParse({
    email: raw,
    code: formData.get("code"),
  });
  if (!parsed.success)
    return { step: "code", email: shownEmail, error: "invalid_code_format" };
  const email = normalizeEmail(parsed.data.email);

  const result = await verifyOtp({
    email,
    purpose: OtpPurpose.VERIFY_EMAIL,
    code: parsed.data.code,
    userId: user.id,
  });
  if (!result.ok)
    return { step: "code", email: shownEmail, error: result.error };

  const now = new Date();
  const existing = await db.user.findUnique({ where: { primaryEmail: email } });

  let targetId = user.id;
  if (existing && existing.id !== user.id) {
    await mergeUsers(user.id, existing.id);
    targetId = existing.id;
    // Not an admin action, but merges are worth an audit trail (§15).
    await audit(
      existing.id,
      "user.merge.line_email",
      { type: "User", id: existing.id },
      {
        fromUserId: user.id,
      },
    );
  } else {
    assertTransition(user.state, AccountState.EMAIL_VERIFIED);
    try {
      await db.user.update({
        where: { id: user.id },
        data: {
          primaryEmail: email,
          emailVerifiedAt: now,
          state: AccountState.EMAIL_VERIFIED,
        },
      });
    } catch (e) {
      // Someone claimed the address between the lookup and the update.
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        return { step: "email", email: shownEmail, error: "generic" };
      }
      throw e;
    }
  }

  // LINE-first users already saw LINE's "Add friend" option at sign-up, so
  // skip the LINE onboarding step if they followed the Official Account.
  const target = await db.user.findUniqueOrThrow({ where: { id: targetId } });
  if (target.lineFollowing && !target.lineOnboardingSeenAt) {
    await db.user.update({
      where: { id: targetId },
      data: { lineOnboardingSeenAt: now },
    });
    target.lineOnboardingSeenAt = now;
  }
  return go(homePathFor(target));
}

/** /onboarding/email form: request / resend / verify / change (see OtpEmailForm). */
export async function verifyEmailAction(
  _prev: OtpFormState,
  formData: FormData,
): Promise<OtpFormState> {
  let user: Awaited<ReturnType<typeof actionUser>>;
  try {
    user = await actionUser(AccountState.UNVERIFIED_EMAIL);
  } catch (e) {
    if (e instanceof AuthError) return go("/app/onboarding");
    throw e;
  }
  const intent = intentSchema.safeParse(formData.get("intent"));
  switch (intent.success ? intent.data : "request") {
    case "change":
      return { step: "email", email: String(formData.get("email") ?? "") };
    case "resend":
      return requestCode(user.id, user.locale, formData, true);
    case "verify":
      return confirmCode(user, formData);
    default:
      return requestCode(user.id, user.locale, formData, false);
  }
}

/** "Skip" on /onboarding/line (§5.2): remember it and continue to verification. */
export async function skipLineOnboardingAction(): Promise<void> {
  const user = await actionUser(AccountState.EMAIL_VERIFIED);
  if (!user.lineOnboardingSeenAt) {
    await db.user.update({
      where: { id: user.id },
      data: { lineOnboardingSeenAt: new Date() },
    });
  }
  return go("/app/onboarding/verify");
}
