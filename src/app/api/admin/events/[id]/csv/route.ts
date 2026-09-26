import { AccountState } from "@/generated/prisma/enums";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { toCsv } from "@/lib/events";
import { getCurrentUser } from "@/lib/session";

/** Attendee list as CSV for Excel (UTF-8 with BOM), admin only (§10.3). */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/admin/events/[id]/csv">,
) {
  const user = await getCurrentUser();
  if (!user || user.state !== AccountState.ACTIVE || !user.isAdmin) {
    return new Response("Forbidden", { status: 403 });
  }
  const { id } = await ctx.params;
  if (id.length > 64) return new Response("Not found", { status: 404 });

  const event = await db.event.findUnique({
    where: { id },
    select: {
      id: true,
      startsAt: true,
      rsvps: {
        orderBy: [{ answer: "asc" }, { updatedAt: "asc" }],
        select: {
          answer: true,
          guests: true,
          updatedAt: true,
          user: {
            select: { nameRomaji: true, nameKanji: true, primaryEmail: true },
          },
        },
      },
    },
  });
  if (!event) return new Response("Not found", { status: 404 });

  // Header stays in English: stable column names for spreadsheets/scripts.
  const rows: (string | number | null)[][] = [
    ["name_romaji", "name_kanji", "email", "answer", "guests", "updated_jst"],
    ...event.rsvps.map((r) => [
      r.user.nameRomaji,
      r.user.nameKanji,
      r.user.primaryEmail,
      r.answer,
      r.guests,
      jst(r.updatedAt),
    ]),
  ];

  // Export of member PII is recorded like other admin actions.
  await audit(
    user.id,
    "event.csv_export",
    { type: "Event", id: event.id },
    { rows: event.rsvps.length },
  );

  const date = jst(event.startsAt).slice(0, 10);
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="event-${date}-${event.id}.csv"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/** "YYYY-MM-DD HH:mm" in JST. */
function jst(d: Date): string {
  return new Date(d.getTime() + 9 * 3600 * 1000)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");
}
