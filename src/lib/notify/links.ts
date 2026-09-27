import { randomBytes } from "node:crypto";
import type { Locale } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { publicUrl } from "@/lib/urls";
import type { RenderedNotification } from "./render";

/**
 * Short links for notifications (/n/<user code>/<token>): notifications
 * never carry app URLs directly, so destinations can change, links expire,
 * each recipient's open is recorded (read receipts), and link previews get a
 * card image (title and body only). The token is 8 base62 characters
 * (~47 bits) and the member's code 6 (~36 bits) — short, not guessable, and
 * neither reveals who the member is.
 */

export const LINK_TTL_DAYS = 90;
const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function randomCode(length: number): string {
  return Array.from(randomBytes(length), (b) => ALPHABET[b % 62]).join("");
}

export function newLinkToken(): string {
  return randomCode(8);
}

export function isLinkToken(token: string): boolean {
  return /^[0-9A-Za-z]{8}$/.test(token);
}

export function isUserCode(code: string): boolean {
  return /^[0-9A-Za-z]{6}$/.test(code);
}

/** The member's link code, created on their first notification. */
export async function ensureLinkCode(user: {
  id: string;
  linkCode?: string | null;
}): Promise<string> {
  if (user.linkCode) return user.linkCode;
  for (let attempt = 0; ; attempt++) {
    const code = randomCode(6);
    try {
      const res = await db.user.updateMany({
        where: { id: user.id, linkCode: null },
        data: { linkCode: code },
      });
      if (res.count) return code;
      // Set meanwhile by another send.
      const row = await db.user.findUnique({
        where: { id: user.id },
        select: { linkCode: true },
      });
      if (row?.linkCode) return row.linkCode;
      throw new Error(`user ${user.id} not found`);
    } catch (e) {
      if (attempt === 2) throw e; // code collision (unique) — try another
    }
  }
}

/** The link without a member (no read receipt). */
export function linkUrl(token: string): string {
  return publicUrl(`/n/${token}`);
}

/** The link one member gets. */
export function recipientUrl(token: string, userCode: string): string {
  return publicUrl(`/n/${userCode}/${token}`);
}

/** Create the short link for one send in one language (returns its id and token). */
export async function createNotificationLink(input: {
  rendered: RenderedNotification;
  refId?: string | null;
  locale: Locale;
  path: string;
}): Promise<{ id: string; token: string }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const token = newLinkToken();
    try {
      return await db.notificationLink.create({
        select: { id: true, token: true },
        data: {
          token,
          kind: input.rendered.kind,
          refId: input.refId ?? null,
          locale: input.locale,
          path: input.path,
          title: input.rendered.title,
          body: input.rendered.body,
          category: input.rendered.category,
          expiresAt: new Date(Date.now() + LINK_TTL_DAYS * 86_400_000),
        },
      });
    } catch (e) {
      if (attempt === 2) throw e; // token collision is astronomically rare
    }
  }
  throw new Error("unreachable");
}
