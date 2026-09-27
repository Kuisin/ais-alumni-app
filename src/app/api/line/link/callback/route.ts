import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { Prisma } from "@/generated/prisma/client";
import { AccountState } from "@/generated/prisma/enums";
import { resolveUserId } from "@/lib/auth/adapter";
import { db } from "@/lib/db";
import { fetchLineFriendship } from "@/lib/line";
import {
  type LinkOutcome,
  type LinkState,
  lineLinkCallbackUrl,
  returnUrl,
  verifyLinkState,
} from "@/lib/line-link";
import { syncRichMenu } from "@/lib/line-richmenu";
import { notifySignInMethodAdded } from "@/lib/security-notice";
import { appUrl } from "@/lib/urls";

/**
 * GET /api/line/link/callback — LINE Login redirect target for linking.
 *
 * SETUP: `${APP_URL}/api/line/link/callback` must be registered as a Callback
 * URL in the LINE Login channel, in addition to Auth.js's
 * `/api/auth/callback/line`.
 *
 * Security: the account to link comes from the HMAC-signed `state` (10-minute
 * expiry), not from a session, so the flow also works on a phone that scanned
 * a QR code from a desktop. The tradeoff is that whoever holds an unexpired
 * token (only ever displayed to the signed-in owner) can bind a LINE account
 * to that user during those 10 minutes. A LINE account already linked to a
 * different user is always refused.
 */

type TokenResponse = { access_token: string; id_token?: string };
type VerifiedIdToken = { sub: string; name?: string };

async function exchangeCode(code: string): Promise<TokenResponse | null> {
  const res = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: lineLinkCallbackUrl(),
      client_id: process.env.AUTH_LINE_ID ?? "",
      client_secret: process.env.AUTH_LINE_SECRET ?? "",
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    console.error(
      `[line-link] token exchange failed: ${res.status} ${await res.text()}`,
    );
    return null;
  }
  return (await res.json()) as TokenResponse;
}

/** Server-side id_token verification via LINE's verify endpoint (checks signature, aud, exp). */
async function verifyIdToken(idToken: string): Promise<VerifiedIdToken | null> {
  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      id_token: idToken,
      client_id: process.env.AUTH_LINE_ID ?? "",
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    console.error(
      `[line-link] id_token verify failed: ${res.status} ${await res.text()}`,
    );
    return null;
  }
  const data = (await res.json()) as { sub?: unknown; name?: unknown };
  if (typeof data.sub !== "string" || !data.sub) return null;
  return {
    sub: data.sub,
    name: typeof data.name === "string" ? data.name : undefined,
  };
}

/**
 * Where to send the browser afterwards. If this browser is signed in as the
 * linked user, return to the page that started the flow; otherwise (e.g. the
 * phone that scanned a QR code) show a standalone "done" page.
 */
async function finish(
  state: LinkState,
  userId: string | null,
  outcome: LinkOutcome,
) {
  const session = await auth().catch(() => null);
  const sameUser = userId !== null && session?.user?.id === userId;
  const target = sameUser
    ? returnUrl(state, { line: outcome })
    : appUrl(`/${state.l}/auth/line-linked?status=${outcome}`);
  return Response.redirect(target, 303);
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const state = verifyLinkState(params.get("state"));
  if (!state)
    return Response.redirect(
      appUrl("/ja/auth/line-linked?status=expired"),
      303,
    );

  // The user declined consent (error=access_denied) or LINE reported an error.
  if (params.get("error")) return finish(state, null, "cancelled");
  const code = params.get("code");
  if (!code) return finish(state, null, "error");

  const userId = await resolveUserId(state.u);
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.state === AccountState.DEACTIVATED)
    return finish(state, null, "error");

  const tokens = await exchangeCode(code);
  const profile = tokens?.id_token
    ? await verifyIdToken(tokens.id_token)
    : null;
  if (!tokens || !profile) return finish(state, user.id, "error");

  // Refuse a LINE account that already belongs to another member.
  const [otherAccount, otherUser] = await Promise.all([
    db.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "line",
          providerAccountId: profile.sub,
        },
      },
      select: { userId: true },
    }),
    db.user.findUnique({
      where: { lineUserId: profile.sub },
      select: { id: true },
    }),
  ]);
  if (
    (otherAccount && otherAccount.userId !== user.id) ||
    (otherUser && otherUser.id !== user.id)
  ) {
    return finish(state, user.id, "taken");
  }

  const following = await fetchLineFriendship(tokens.access_token);

  try {
    await db.$transaction([
      // A member has at most one LINE account: replace a previously linked one.
      db.account.deleteMany({
        where: {
          userId: user.id,
          provider: "line",
          providerAccountId: { not: profile.sub },
        },
      }),
      db.account.upsert({
        where: {
          provider_providerAccountId: {
            provider: "line",
            providerAccountId: profile.sub,
          },
        },
        create: {
          userId: user.id,
          type: "oidc",
          provider: "line",
          providerAccountId: profile.sub,
          access_token: tokens.access_token,
          id_token: tokens.id_token ?? null,
          token_type: "Bearer",
          scope: "profile openid",
        },
        update: {
          access_token: tokens.access_token,
          id_token: tokens.id_token ?? null,
        },
      }),
      db.user.update({
        where: { id: user.id },
        data: {
          lineUserId: profile.sub,
          lineDisplayName: profile.name ?? null,
          // null = friendship status unknown (API error): keep the webhook-maintained value.
          ...(following === null ? {} : { lineFollowing: following }),
        },
      }),
    ]);
  } catch (e) {
    // Lost a race with another member linking the same LINE account.
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return finish(state, user.id, "taken");
    }
    console.error("[line-link] failed to save link", e);
    return finish(state, user.id, "error");
  }

  await notifySignInMethodAdded(user.id, "line");
  await syncRichMenu(profile.sub, user.locale);
  return finish(state, user.id, "linked");
}
