import { openNotificationLink } from "@/lib/notify/open";

/** /n/<token>: a notification link without a member (no read receipt). */
export async function GET(request: Request, ctx: RouteContext<"/n/[key]">) {
  const { key } = await ctx.params;
  return openNotificationLink(request, key, null);
}
