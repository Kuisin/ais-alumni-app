import { EMBED_COOKIE } from "@/lib/embed";
import {
  sessionCookieName,
  webSessionCookie,
  webViewPath,
} from "@/lib/mobile/handoff";
import { getCurrentUser } from "@/lib/session";
import { homePathFor } from "@/lib/state-machine";

/**
 * Opens a website page inside the native app, signed in. The app's web
 * view loads this URL once with its bearer token in the Authorization
 * header; the response sets an Auth.js session cookie (and the embed
 * marker that hides the website's own navigation) and redirects to
 * `?next=`. Screens the app doesn't have natively — onboarding, admin mode,
 * family, invites… — work this way.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const url = new URL(request.url);
  const path = webViewPath(url.searchParams.get("next")) ?? homePathFor(user);
  const secure = url.protocol === "https:";
  const attrs = `Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
  const { value } = await webSessionCookie(user.id, secure);
  const headers = new Headers({
    Location: `/${user.locale}${path}`,
    "Cache-Control": "no-store",
  });
  // Session cookies (no Max-Age): gone when the web view closes.
  headers.append(
    "Set-Cookie",
    `${sessionCookieName(secure)}=${value}; ${attrs}`,
  );
  headers.append("Set-Cookie", `${EMBED_COOKIE}=1; ${attrs}`);
  return new Response(null, { status: 303, headers });
}
