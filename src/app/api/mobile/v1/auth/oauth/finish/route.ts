import { auth } from "@/auth";
import {
  allowedAppRedirect,
  createHandoffCode,
  sessionCookieName,
  validChallenge,
} from "@/lib/mobile/handoff";

/**
 * Google / LINE sign-in for the native app, step 2: Auth.js has signed the
 * member in inside the browser. Hand the app a short-lived code bound to
 * its PKCE challenge (exchanged at ../exchange) and drop the browser's
 * website session — the app keeps its own.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const challenge = url.searchParams.get("challenge");
  const redirect = allowedAppRedirect(url.searchParams.get("redirect"));
  if (!validChallenge(challenge) || !redirect)
    return new Response("Bad request", { status: 400 });

  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  const target = new URL(redirect);
  if (userId)
    target.searchParams.set("code", createHandoffCode(userId, challenge));
  else target.searchParams.set("error", "signin_failed");

  const secure = url.protocol === "https:";
  const headers = new Headers({ Location: target.toString() });
  headers.append(
    "Set-Cookie",
    `${sessionCookieName(secure)}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`,
  );
  return new Response(null, { status: 302, headers });
}
