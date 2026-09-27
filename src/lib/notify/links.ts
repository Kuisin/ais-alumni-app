import { randomBytes } from "node:crypto";
import type { Locale } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { publicUrl } from "@/lib/urls";
import type { RenderedNotification } from "./render";

/**
 * Short links for notifications (/n/<token>): notifications never carry app
 * URLs directly, so destinations can change, links expire, opens are
 * counted, and link previews get a card image (title and body only). The
 * token is 8 base62 characters (~47 bits) — short, and not guessable.
 */

export const LINK_TTL_DAYS = 90;
const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function newLinkToken(): string {
  const bytes = randomBytes(8);
  return Array.from(bytes, (b) => ALPHABET[b % 62]).join("");
}

export function isLinkToken(token: string): boolean {
  return /^[0-9A-Za-z]{8}$/.test(token);
}

/** Create the short link for one send in one language. */
export async function createNotificationLink(input: {
  rendered: RenderedNotification;
  refId?: string | null;
  locale: Locale;
  path: string;
}): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const token = newLinkToken();
    try {
      await db.notificationLink.create({
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
      return publicUrl(`/n/${token}`);
    } catch (e) {
      if (attempt === 2) throw e; // token collision is astronomically rare
    }
  }
  throw new Error("unreachable");
}
