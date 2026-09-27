import { NextResponse } from "next/server";
import { findOpenInvite, INVITE_COOKIE } from "@/lib/invites";

/**
 * Opening an invitation link: remember the token (httpOnly cookie) and go to
 * sign-in; the application picks it up. Invalid or used links say so there.
 */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/invite/[token]">,
) {
  const { token } = await ctx.params;
  const url = new URL(request.url);
  const locale = url.searchParams.get("l") === "en" ? "en" : "ja";
  const invite = await findOpenInvite(token);
  const to = new URL(`/${locale}/app`, url.origin);
  to.searchParams.set("invite", invite ? "1" : "invalid");
  const res = NextResponse.redirect(to, 303);
  if (invite)
    res.cookies.set(INVITE_COOKIE, token, {
      httpOnly: true,
      secure: url.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
  return res;
}
