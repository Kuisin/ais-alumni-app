import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { encode } from "next-auth/jwt";

/**
 * Moving a sign-in between the native app and the website.
 *
 * App → site (Google / LINE sign-in): the app opens
 * /api/mobile/v1/auth/oauth/start in the system browser with a PKCE
 * challenge; after Auth.js signs the member in there, .../oauth/finish
 * redirects to the app's URL scheme with a short-lived code bound to that
 * challenge. Only the app, which holds the verifier, can exchange the code
 * for a session token (RFC 7636 / RFC 8252), so an intercepted redirect is
 * useless.
 *
 * Site ← app (screens that are only on the website): the app loads
 * /api/mobile/v1/web in its web view with its bearer token in a header;
 * that route sets an ordinary Auth.js session cookie (webSessionCookie).
 */

/** Where the app receives the sign-in code. */
export const APP_REDIRECT = "aisalumni://auth";
const CODE_TTL_MS = 2 * 60 * 1000;

/**
 * The app's own scheme only. Expo Go (exp://…) is allowed for local
 * development servers, never on a deployment.
 */
export function allowedAppRedirect(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 300) return null;
  if (value === APP_REDIRECT) return value;
  if (
    process.env.NODE_ENV !== "production" &&
    /^exps?:\/\/[\w.:-]+\/--\/auth$/.test(value)
  )
    return value;
  return null;
}

/** PKCE (S256): 43–128 unreserved characters. */
export function validVerifier(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9\-._~]{43,128}$/.test(v);
}

export function validChallenge(c: unknown): c is string {
  return typeof c === "string" && /^[A-Za-z0-9_-]{43}$/.test(c);
}

export function challengeFor(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

function key(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  // Separate key: codes can't be confused with any other HMAC in the app.
  return createHmac("sha256", secret).update("mobile-handoff").digest();
}

type CodePayload = { u: string; c: string; e: number };

/** A code for the member who just signed in, bound to the app's challenge. */
export function createHandoffCode(
  userId: string,
  challenge: string,
  now = Date.now(),
): string {
  const payload: CodePayload = {
    u: userId,
    c: challenge,
    e: now + CODE_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = createHmac("sha256", key()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

/** The member id, if the code is genuine, unexpired and matches the verifier. */
export function redeemHandoffCode(
  code: unknown,
  verifier: unknown,
  now = Date.now(),
): string | null {
  if (typeof code !== "string" || code.length > 1000) return null;
  if (!validVerifier(verifier)) return null;
  const [body, mac] = code.split(".");
  if (!body || !mac) return null;
  const expected = Buffer.from(
    createHmac("sha256", key()).update(body).digest("base64url"),
  );
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given))
    return null;
  let payload: CodePayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof payload.u !== "string" || typeof payload.e !== "number")
    return null;
  if (payload.e < now) return null;
  const a = Buffer.from(challengeFor(verifier));
  const b = Buffer.from(String(payload.c));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return payload.u;
}

/**
 * A website page the app may open in its web view (locale-less): app pages
 * (/app/…, onboarding included), /support and /privacy. Never another
 * origin; the member's locale is added by the caller.
 */
export function webViewPath(value: unknown): string | null {
  if (typeof value !== "string" || !value || value.length > 500) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\"))
    return null;
  let path = value.replace(/^\/(ja|en)(?=\/|$|\?)/, "") || "/";
  try {
    const u = new URL(path, "https://x.invalid");
    if (u.origin !== "https://x.invalid") return null;
    path = u.pathname + u.search + u.hash;
  } catch {
    return null;
  }
  if (
    !/^\/(app(\/|$|\?|#)|support$|support[?#]|privacy$|privacy[?#])/.test(path)
  )
    return null;
  // Sign-in screens are the app's own.
  if (/^\/app\/?(\?|#|$)|^\/app\/auth(\/|$|\?|#)/.test(path)) return null;
  return path;
}

/** Auth.js's session cookie name (the __Secure- prefix on https). */
export function sessionCookieName(secure: boolean): string {
  return `${secure ? "__Secure-" : ""}authjs.session-token`;
}

/**
 * An Auth.js session cookie for this member, as if they had signed in on
 * the website (same encryption, salt and claims as src/auth.ts's JWTs).
 */
export async function webSessionCookie(
  userId: string,
  secure: boolean,
): Promise<{ name: string; value: string }> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  const name = sessionCookieName(secure);
  const value = await encode({
    token: { sub: userId },
    secret,
    salt: name,
    // Same as Auth.js's default session length; the web view's cookie jar
    // is in-memory anyway (the app opens it in incognito mode).
    maxAge: 30 * 24 * 60 * 60,
  });
  return { name, value };
}
