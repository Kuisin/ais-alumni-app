import { cookies } from "next/headers";
import { auth } from "@/auth";
import {
  allowedAppRedirect,
  createHandoffCode,
  FLOW_COOKIE,
  FLOW_COOKIE_PATH,
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

  // Only a sign-in that ../start began in this browser, for this challenge.
  const started = (await cookies()).get(FLOW_COOKIE)?.value === challenge;
  const session = started ? await auth().catch(() => null) : null;
  const userId = session?.user?.id;
  const target = new URL(redirect);
  if (userId)
    target.searchParams.set("code", createHandoffCode(userId, challenge));
  else target.searchParams.set("error", "signin_failed");

  const secure = url.protocol === "https:";
  const flags = `Max-Age=0; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
  const headers = new Headers({ Location: target.toString() });
  // The flow is over either way.
  headers.append(
    "Set-Cookie",
    `${FLOW_COOKIE}=; Path=${FLOW_COOKIE_PATH}; ${flags}`,
  );
  // This browser's sign-in was only for the app: don't leave it signed in
  // (only for a flow the app started — never sign anyone else out).
  if (started)
    headers.append(
      "Set-Cookie",
      `${sessionCookieName(secure)}=; Path=/; ${flags}`,
    );
  return new Response(null, { status: 302, headers });
}
