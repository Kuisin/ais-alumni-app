import { openNotificationLink } from "@/lib/notify/open";

/** /n/<member code>/<token>: one member's notification link (read receipt). */
export async function GET(
  request: Request,
  ctx: RouteContext<"/n/[key]/[token]">,
) {
  const { key, token } = await ctx.params;
  return openNotificationLink(request, token, key);
}
