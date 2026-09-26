import { buildUserExport } from "@/lib/account";
import { getCurrentUser } from "@/lib/session";

/**
 * APPI data export: a JSON download of the signed-in user's own data.
 * Any signed-in user may export (not only ACTIVE members) — the right to
 * access one's data does not depend on account state.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const data = await buildUserExport(user.id);
  if (!data) return new Response("Not found", { status: 404 });
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="ais-alumni-my-data-${date}.json"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
