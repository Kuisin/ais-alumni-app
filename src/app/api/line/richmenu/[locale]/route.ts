import { richMenuImage } from "@/lib/line-richmenu-image";

/**
 * Preview of the LINE rich menu image (the same PNG that gets uploaded);
 * ?chats=1 / ?news=1 show the unread dots.
 */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/line/richmenu/[locale]">,
) {
  const { locale } = await ctx.params;
  if (locale !== "ja" && locale !== "en")
    return new Response("Not found", { status: 404 });
  const q = new URL(request.url).searchParams;
  const img = await richMenuImage(locale, {
    chats: q.get("chats") === "1",
    news: q.get("news") === "1",
  });
  img.headers.set("Cache-Control", "no-store");
  return img;
}
