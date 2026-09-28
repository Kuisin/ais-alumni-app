import { isAuthorizedCron } from "@/lib/cron";
import { syncLineMenus } from "@/lib/line-menu-sync";

export const maxDuration = 60;

/**
 * LINE rich menu unread dots: links each LINE friend to the menu variant for
 * their unread chats and news (src/lib/line-menu-sync.ts). Called every
 * minute by Supabase pg_cron (scripts/setup-supabase-cron.ts). Cheap when
 * nothing changed: LINE is only called for members whose variant changed.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request))
    return new Response("Unauthorized", { status: 401 });
  const res = await syncLineMenus();
  return Response.json({ ok: true, ranAt: new Date().toISOString(), ...res });
}
