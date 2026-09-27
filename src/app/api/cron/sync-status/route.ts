import { syncAllChatMemberships } from "@/lib/chat-db";
import { isAuthorizedCron } from "@/lib/cron";
import { syncAllStatuses } from "@/lib/status-sync";

export const maxDuration = 300;

/**
 * Daily 00:05 JST: move members between current / former and up a grade as
 * the school year (April–March) and leave years pass, then update their
 * group chats to match.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request))
    return new Response("Unauthorized", { status: 401 });
  const statuses = await syncAllStatuses();
  const chats = await syncAllChatMemberships();
  return Response.json({ ...statuses, chatMembershipsChanged: chats });
}
