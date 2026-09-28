import { cookies } from "next/headers";
import { signIn } from "@/auth";
import {
  allowedAppRedirect,
  sessionCookieName,
  validChallenge,
} from "@/lib/mobile/handoff";
import { ssoReady } from "@/lib/sso";

/**
 * Google / LINE sign-in for the native app, step 1. The app opens this URL
 * in the system browser (an auth session) with a PKCE challenge; Auth.js
 * then runs the provider's sign-in exactly as on the website and returns to
 * ../finish. See src/lib/mobile/handoff.ts.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider");
  const challenge = url.searchParams.get("challenge");
  const redirect = allowedAppRedirect(url.searchParams.get("redirect"));
  const locale = url.searchParams.get("locale") === "en" ? "en" : "ja";
  if (
    (provider !== "google" && provider !== "line") ||
    !validChallenge(challenge) ||
    !redirect
  )
    return new Response("Bad request", { status: 400 });
  if (!ssoReady(provider))
    return new Response("Sign-in method not available", { status: 404 });

  const secure = url.protocol === "https:";
  const jar = await cookies();
  // A website session already in this browser (Android shares Chrome's
  // cookies) would get the provider linked to it instead of signing in.
  jar.set(sessionCookieName(secure), "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure,
  });
  // Language for a new account (the adapter reads NEXT_LOCALE).
  jar.set("NEXT_LOCALE", locale, { path: "/", sameSite: "lax", secure });
  const finish = `/api/mobile/v1/auth/oauth/finish?${new URLSearchParams({ challenge, redirect })}`;
  // Redirects to the provider (throws NEXT_REDIRECT).
  await signIn(provider, { redirectTo: finish });
  return new Response(null, { status: 500 });
}
