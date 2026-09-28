import { createHash, randomBytes } from "node:crypto";
import { resolveUserId } from "@/lib/auth/adapter";
import { db } from "@/lib/db";

/**
 * Native app sessions (mobile/). The app signs in once (email code, or
 * Google / LINE through the system browser) and receives a random bearer
 * token, kept in the device keychain and sent as `Authorization: Bearer …`.
 * Only its SHA-256 is stored (MobileSession.tokenHash). Sessions last 180
 * days from the last use; signing out on the device deletes the row.
 *
 * Browsers never send this header on their own, so accepting it next to the
 * Auth.js cookie (getCurrentUser in src/lib/session.ts) adds no CSRF surface.
 */

export const MOBILE_SESSION_TTL_MS = 180 * 24 * 60 * 60 * 1000;
/** lastUsedAt / expiresAt are refreshed at most this often. */
const TOUCH_EVERY_MS = 24 * 60 * 60 * 1000;
const PREFIX = "aism_";

export function hashMobileToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

/** The token from an `Authorization: Bearer <token>` header, if well-formed. */
export function bearerToken(header: string | null | undefined): string | null {
  const m = /^Bearer\s+(\S+)$/i.exec(header?.trim() ?? "");
  const token = m?.[1];
  if (!token?.startsWith(PREFIX) || token.length > 100) return null;
  return token;
}

export type DeviceInfo = {
  platform?: string | null;
  deviceName?: string | null;
};

function clean(value: string | null | undefined, max: number): string | null {
  const v = value?.trim();
  return v ? v.slice(0, max) : null;
}

/** Start a session for a signed-in member; returns the bearer token. */
export async function createMobileSession(
  userId: string,
  device: DeviceInfo = {},
): Promise<string> {
  const token = PREFIX + randomBytes(32).toString("base64url");
  const now = Date.now();
  await db.mobileSession.create({
    data: {
      userId,
      tokenHash: hashMobileToken(token),
      platform: clean(device.platform, 20),
      deviceName: clean(device.deviceName, 100),
      lastUsedAt: new Date(now),
      expiresAt: new Date(now + MOBILE_SESSION_TTL_MS),
    },
  });
  return token;
}

/**
 * The member a token belongs to (following account merges), or null when
 * the token is unknown or expired. Refreshes the expiry about once a day.
 */
export async function mobileSessionUserId(
  token: string,
): Promise<string | null> {
  const row = await db.mobileSession.findUnique({
    where: { tokenHash: hashMobileToken(token) },
    select: { id: true, userId: true, lastUsedAt: true, expiresAt: true },
  });
  if (!row) return null;
  const now = Date.now();
  if (row.expiresAt.getTime() <= now) {
    await db.mobileSession.deleteMany({ where: { id: row.id } });
    return null;
  }
  if (now - row.lastUsedAt.getTime() > TOUCH_EVERY_MS) {
    await db.mobileSession.updateMany({
      where: { id: row.id },
      data: {
        lastUsedAt: new Date(now),
        expiresAt: new Date(now + MOBILE_SESSION_TTL_MS),
      },
    });
  }
  return resolveUserId(row.userId);
}

/** Sign out this device. */
export async function revokeMobileSession(token: string): Promise<void> {
  await db.mobileSession.deleteMany({
    where: { tokenHash: hashMobileToken(token) },
  });
}
