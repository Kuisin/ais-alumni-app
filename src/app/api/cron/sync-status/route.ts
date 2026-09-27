import { isAuthorizedCron } from "@/lib/cron";
import { syncAllStatuses } from "@/lib/status-sync";

/**
 * Daily 00:05 JST: move members between current / former and up a grade as
 * the school year (April–March) and leave years pass.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request))
    return new Response("Unauthorized", { status: 401 });
  return Response.json(await syncAllStatuses());
}
