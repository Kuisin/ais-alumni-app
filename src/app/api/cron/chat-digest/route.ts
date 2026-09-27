import { sendChatDigest } from "@/lib/chat-db";
import { isAuthorizedCron } from "@/lib/cron";

export const maxDuration = 300;

/**
 * Daily 20:00 JST: one LINE/email per member with unread group-chat
 * messages from the last day (count and link only).
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request))
    return new Response("Unauthorized", { status: 401 });
  const now = new Date();
  return Response.json({
    ok: true,
    ranAt: now.toISOString(),
    ...(await sendChatDigest(now)),
  });
}
