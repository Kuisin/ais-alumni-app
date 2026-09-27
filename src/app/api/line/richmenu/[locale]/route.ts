import { richMenuImage } from "@/lib/line-richmenu-image";

/** Preview of the LINE rich menu image (the same PNG that gets uploaded). */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/line/richmenu/[locale]">,
) {
  const { locale } = await ctx.params;
  if (locale !== "ja" && locale !== "en")
    return new Response("Not found", { status: 404 });
  const img = await richMenuImage(locale);
  img.headers.set("Cache-Control", "no-store");
  return img;
}
