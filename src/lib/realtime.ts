import { createHmac } from "node:crypto";

/**
 * Supabase Realtime (Broadcast on private channels) for live chat and
 * in-app notifications. The server pushes events after writing to the
 * database; browsers join `chat:<groupId>` / `user:<userId>` with a
 * short-lived JWT signed here (sub = User.id) and the realtime.messages RLS
 * policy (migration 20260928150000_group_chat) checks membership. Without
 * the env vars nothing is pushed and the UI polls instead.
 */

export type RealtimePublic = { url: string; key: string };

export function realtimePublic(): RealtimePublic | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !process.env.SUPABASE_JWT_SECRET) return null;
  return { url: url.replace(/\/$/, ""), key };
}

export const REALTIME_TOKEN_TTL_S = 60 * 60;

const b64 = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url");

/** HS256 JWT for the Realtime socket (role `authenticated`). */
export function realtimeToken(
  userId: string,
  secret = process.env.SUPABASE_JWT_SECRET,
  now = Math.floor(Date.now() / 1000),
): string {
  if (!secret) throw new Error("SUPABASE_JWT_SECRET is not set");
  const head = b64({ alg: "HS256", typ: "JWT" });
  const body = b64({
    sub: userId,
    role: "authenticated",
    aud: "authenticated",
    iat: now,
    exp: now + REALTIME_TOKEN_TTL_S,
  });
  const sig = createHmac("sha256", secret)
    .update(`${head}.${body}`)
    .digest("base64url");
  return `${head}.${body}.${sig}`;
}

export type RealtimeEvent = {
  topic: string;
  event: string;
  payload: Record<string, unknown>;
};

/** Push events to private channels (best-effort; never throws). */
export async function broadcast(
  events: readonly RealtimeEvent[],
): Promise<void> {
  const pub = realtimePublic();
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!pub || !secret || events.length === 0) return;
  for (let i = 0; i < events.length; i += 100) {
    const chunk = events.slice(i, i + 100);
    try {
      const res = await fetch(`${pub.url}/realtime/v1/api/broadcast`, {
        method: "POST",
        headers: { apikey: secret, "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chunk.map((e) => ({ ...e, private: true })),
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok)
        console.error(
          "[realtime] broadcast failed",
          res.status,
          await res.text(),
        );
    } catch (e) {
      console.error("[realtime] broadcast failed", e);
    }
  }
}

/** Ask these members' open pages to refresh (badges, lists). */
export function refreshUsers(userIds: readonly string[], reason: string) {
  return broadcast(
    userIds.map((id) => ({
      topic: `user:${id}`,
      event: "refresh",
      payload: { reason },
    })),
  );
}
