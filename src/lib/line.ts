import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * LINE Messaging API helpers for the "AIS Alumni Committee" Official Account.
 * The Messaging API channel MUST be under the same LINE provider as the LINE
 * Login channel so userIds match (§5.1).
 */

const API = "https://api.line.me/v2/bot";

export type LineTextMessage = { type: "text"; text: string };

let cached: { token: string; expiresAt: number } | null = null;

/**
 * Channel access token. Prefers a stateless token (15 min) issued from the
 * channel ID + secret, so no long-lived token has to be stored; falls back to
 * LINE_MESSAGING_CHANNEL_ACCESS_TOKEN if that is set instead.
 */
async function token(): Promise<string | null> {
  const id = process.env.LINE_MESSAGING_CHANNEL_ID;
  const secret = process.env.LINE_MESSAGING_CHANNEL_SECRET;
  if (!id || !secret)
    return process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN ?? null;
  // Refresh a minute early so a token never expires mid-request.
  if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.token;
  const res = await fetch("https://api.line.me/oauth2/v3/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: id,
      client_secret: secret,
    }),
  });
  if (!res.ok) {
    throw new Error(
      `LINE token request failed: ${res.status} ${await res.text()}`,
    );
  }
  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  cached = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cached.token;
}

export function verifyLineSignature(
  rawBody: string,
  signature: string | null,
  secret = process.env.LINE_MESSAGING_CHANNEL_SECRET,
): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  let given: Buffer;
  try {
    given = Buffer.from(signature, "base64");
  } catch {
    return false;
  }
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function call(path: string, body: unknown): Promise<void> {
  const t = await token();
  if (!t) {
    console.info(`[line:dev] POST ${path} ${JSON.stringify(body)}`);
    return;
  }
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${t}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(
      `LINE API ${path} failed: ${res.status} ${await res.text()}`,
    );
  }
}

export async function linePush(
  to: string,
  messages: LineTextMessage[],
): Promise<void> {
  await call("/message/push", { to, messages });
}

/** Multicast to up to 500 userIds per request; batches automatically. */
export async function lineMulticast(
  to: string[],
  messages: LineTextMessage[],
): Promise<void> {
  for (let i = 0; i < to.length; i += 500) {
    await call("/message/multicast", { to: to.slice(i, i + 500), messages });
  }
}

/** Whether the user has added the Official Account (LINE Login access token). */
export async function fetchLineFriendship(
  accessToken: string,
): Promise<boolean | null> {
  try {
    const res = await fetch("https://api.line.me/friendship/v1/status", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { friendFlag?: boolean };
    return data.friendFlag ?? null;
  } catch {
    return null;
  }
}
