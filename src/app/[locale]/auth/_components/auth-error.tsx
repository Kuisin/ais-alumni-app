import { getTranslations } from "next-intl/server";
import { Alert } from "@/components/ui/card";

/**
 * Auth.js error codes we explain specifically. Sign-in-kind errors
 * (OAuthAccountNotLinked, CredentialsSignin, OAuthCallbackError, …) are sent to
 * the sign-in page ("/?error=…"); others (AccessDenied, Configuration,
 * Verification) to /auth/error. Anything else maps to "Default".
 */
const KNOWN = [
  "OAuthAccountNotLinked",
  "AccessDenied",
  "Verification",
  "Configuration",
  "OAuthCallbackError",
  "OAuthSignin",
  "CredentialsSignin",
  "MissingCSRF",
] as const;

export type AuthErrorKey = (typeof KNOWN)[number] | "Default";

export function authErrorKey(error: unknown): AuthErrorKey | null {
  const value = Array.isArray(error) ? error[0] : error;
  if (typeof value !== "string" || !value) return null;
  return (KNOWN as readonly string[]).includes(value)
    ? (value as AuthErrorKey)
    : "Default";
}

/** Inline alert version, used on the landing page for `?error=`. */
export async function AuthErrorAlert({ error }: { error: AuthErrorKey }) {
  const t = await getTranslations("auth.errors");
  return (
    <Alert tone="error">
      <p className="font-semibold">{t(`${error}.title`)}</p>
      <p className="mt-1">{t(`${error}.body`)}</p>
    </Alert>
  );
}
