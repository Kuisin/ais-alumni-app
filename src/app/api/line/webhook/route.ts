import { db } from "@/lib/db";
import { verifyLineSignature } from "@/lib/line";

/**
 * POST /api/line/webhook — Messaging API webhook for the Official Account.
 * Tracks friendship (follow / unfollow) so notifications route to LINE only
 * for members who can actually receive pushes (§5.4). No replies are sent.
 */

type LineEvent = { type?: string; source?: { type?: string; userId?: string } };

export async function POST(req: Request) {
  // The signature is computed over the exact raw body, so read it as text first.
  const raw = await req.text();
  if (!verifyLineSignature(raw, req.headers.get("x-line-signature"))) {
    return new Response("invalid signature", { status: 401 });
  }

  let events: LineEvent[] = [];
  try {
    const body = JSON.parse(raw) as { events?: LineEvent[] };
    events = Array.isArray(body.events) ? body.events : [];
  } catch {
    // Valid signature but unparsable body: acknowledge so LINE doesn't retry.
    return new Response(null, { status: 200 });
  }

  for (const event of events) {
    const lineUserId = event.source?.userId;
    if (!lineUserId) continue;
    if (event.type === "follow" || event.type === "unfollow") {
      try {
        // updateMany: the LINE user may not be linked to any member (no-op).
        await db.user.updateMany({
          where: { lineUserId },
          data: { lineFollowing: event.type === "follow" },
        });
      } catch (e) {
        console.error("[line-webhook] failed to update friendship", e);
      }
    }
  }
  return new Response(null, { status: 200 });
}
