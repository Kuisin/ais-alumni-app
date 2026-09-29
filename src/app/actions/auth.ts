"use server";

import { AuthError } from "next-auth";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { signIn } from "@/auth";
import { OtpPurpose } from "@/generated/prisma/enums";
import { diagnoseSignInCode } from "@/lib/auth/email-sign-in";
import { issueOtp, normalizeEmail } from "@/lib/auth/otp";
import { safeNextPath } from "@/lib/next-path";
import { ssoReady } from "@/lib/sso";

// Sign-in actions are, by nature, callable without a session, so they do not
// call actionUser(); all input is validated with Zod and codes are
// rate-limited in issueOtp / verifyOtp.

/**
 * State shared by the two email-code forms (sign-in here, and email
 * verification in ./onboarding.ts). Rendered by OtpEmailForm.
 */
export type OtpFormState = {
  step: "email" | "code";
  email?: string;
  error?:
    | "invalid_email"
    | "invalid_code_format"
    | "rate_limited"
    | "send_failed"
    | "invalid"
    | "expired"
    | "too_many_attempts"
    | "generic";
  notice?: "sent" | "resent";
};

const emailSchema = z.object({ email: z.email().max(254) });
const codeSchema = z.object({
  email: z.email().max(254),
  code: z
    .string()
    .transform((s) => s.replace(/\s/g, ""))
    .pipe(z.string().regex(/^\d{6}$/)),
});
const intentSchema = z.enum(["request", "resend", "verify", "change"]);

async function currentLocale(): Promise<"ja" | "en"> {
  return (await getLocale()) === "en" ? "en" : "ja";
}

async function requestSignInCode(
  formData: FormData,
  resend: boolean,
): Promise<OtpFormState> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { step: "email", error: "invalid_email" };
  const email = normalizeEmail(parsed.data.email);
  const result = await issueOtp({
    email,
    purpose: OtpPurpose.SIGN_IN,
    locale: await currentLocale(),
  });
  if (!result.ok && result.error === "send_failed") {
    return { step: "email", email, error: "send_failed" };
  }
  if (!result.ok) {
    // Rate limiting means a code was sent recently (e.g. the page was
    // reloaded), so let the user enter that one.
    return { step: "code", email, error: "rate_limited" };
  }
  return { step: "code", email, notice: resend ? "resent" : "sent" };
}

async function verifySignInCode(formData: FormData): Promise<OtpFormState> {
  const parsed = codeSchema.safeParse({
    email: formData.get("email"),
    code: formData.get("code"),
  });
  const email =
    typeof formData.get("email") === "string"
      ? String(formData.get("email"))
      : "";
  if (!parsed.success)
    return { step: "code", email, error: "invalid_code_format" };
  const normalized = normalizeEmail(parsed.data.email);

  // Cheap pre-check so expired / locked codes get a precise message.
  const pre = await diagnoseSignInCode(normalized);
  if (pre === "expired" || pre === "too_many_attempts")
    return { step: "code", email, error: pre };

  const locale = await currentLocale();
  try {
    // Throws NEXT_REDIRECT on success; /onboarding forwards to homePathFor(user).
    await signIn("email-otp", {
      email: normalized,
      code: parsed.data.code,
      locale,
      redirectTo: afterSignIn(locale, formData.get("next")),
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return {
        step: "code",
        email,
        error: await diagnoseSignInCode(normalized),
      };
    }
    throw e; // redirect
  }
  return { step: "code", email, error: "generic" };
}

/**
 * Email sign-in (§4.1), both steps in one action so a single useActionState
 * drives the form. `intent`: request → send code, resend → send again,
 * verify → check code and sign in, change → back to the email step.
 */
export async function emailSignInAction(
  _prev: OtpFormState,
  formData: FormData,
): Promise<OtpFormState> {
  const intent = intentSchema.safeParse(formData.get("intent"));
  switch (intent.success ? intent.data : "request") {
    case "change":
      return { step: "email", email: String(formData.get("email") ?? "") };
    case "resend":
      return requestSignInCode(formData, true);
    case "verify":
      return verifySignInCode(formData);
    default:
      return requestSignInCode(formData, false);
  }
}

/** Where sign-in lands: /onboarding forwards by state (and to ?next=). */
function afterSignIn(locale: string, next: unknown): string {
  const path = safeNextPath(next);
  return `/${locale}/app/onboarding${path ? `?next=${encodeURIComponent(path)}` : ""}`;
}

async function oauthSignIn(
  provider: "google" | "line",
  formData?: FormData,
): Promise<void> {
  // The button is disabled when not configured; ignore stale forms.
  if (!ssoReady(provider)) return;
  const locale = await currentLocale();
  await signIn(provider, {
    redirectTo: afterSignIn(locale, formData?.get("next")),
  });
}

export async function signInWithGoogle(formData?: FormData): Promise<void> {
  await oauthSignIn("google", formData);
}

export async function signInWithLine(formData?: FormData): Promise<void> {
  await oauthSignIn("line", formData);
}
