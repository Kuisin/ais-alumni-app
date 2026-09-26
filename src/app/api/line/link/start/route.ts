import type { NextRequest } from "next/server";
import { lineLinkCallbackUrl, verifyLinkState } from "@/lib/line-link";
import { appUrl } from "@/lib/urls";

/**
 * GET /api/line/link/start?s=<signed state>
 *
 * Entry point of the custom LINE linking flow (see src/lib/line-link.ts). May
 * be opened on a device without a session (phone that scanned a desktop QR
 * code): the signed state identifies the account.
 */
export async function GET(req: NextRequest) {
  const s = req.nextUrl.searchParams.get("s");
  const state = verifyLinkState(s);
  const clientId = process.env.AUTH_LINE_ID;
  if (!state || !s) {
    return Response.redirect(
      appUrl("/ja/auth/line-linked?status=expired"),
      303,
    );
  }
  if (!clientId) {
    return Response.redirect(
      appUrl(`/${state.l}/auth/line-linked?status=error`),
      303,
    );
  }

  const url = new URL("https://access.line.me/oauth2/v2.1/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", lineLinkCallbackUrl());
  // The signed state doubles as the OAuth `state` parameter; it is verified
  // again (signature + expiry) in the callback.
  url.searchParams.set("state", s);
  url.searchParams.set("scope", "profile openid");
  // Show the "Add friend" option for the Official Account on the consent screen (§5.3).
  url.searchParams.set("bot_prompt", "aggressive");
  url.searchParams.set("ui_locales", state.l === "ja" ? "ja" : "en");
  return Response.redirect(url.toString(), 303);
}
