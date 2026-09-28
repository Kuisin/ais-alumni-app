import { AccountState } from "@/generated/prisma/enums";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { eventWorkbook } from "@/lib/event-xlsx";
import { getCurrentUser } from "@/lib/session";

/** Event detail and attendees as an Excel workbook, admins and the author. */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/admin/events/[id]/xlsx">,
) {
  const user = await getCurrentUser();
  if (!user || user.state !== AccountState.ACTIVE) {
    return new Response("Forbidden", { status: 403 });
  }
  const { id } = await ctx.params;
  if (id.length > 64) return new Response("Not found", { status: 404 });
  // Admins, or the author of the event (teacher / 同窓会委員 / 学年代表).
  if (!user.isAdmin) {
    const event = await db.event.findUnique({
      where: { id },
      select: { createdById: true },
    });
    if (event?.createdById !== user.id)
      return new Response("Forbidden", { status: 403 });
  }
  const lang = new URL(request.url).searchParams.get("lang");
  const locale = lang === "en" || lang === "ja" ? lang : user.locale;

  const book = await eventWorkbook(id, locale);
  if (!book) return new Response("Not found", { status: 404 });

  // Export of member PII is recorded like other admin actions.
  await audit(
    user.id,
    "event.xlsx_export",
    { type: "Event", id },
    { rows: book.rows },
  );

  const date = new Date(book.startsAt.getTime() + 9 * 3600_000)
    .toISOString()
    .slice(0, 10);
  return new Response(new Uint8Array(book.buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="event-${date}-${id}.xlsx"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
