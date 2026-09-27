import { NextResponse } from "next/server";
import { getTranslatorFor } from "@/i18n/translator";
import { db } from "@/lib/db";
import { isLinkToken } from "@/lib/notify/links";

/** Link-preview fetchers (LINE, Slack, …) — not people opening the link. */
const PREVIEW_BOT =
  /facebookexternalhit|line-poker|Twitterbot|Slackbot|Discordbot|WhatsApp|TelegramBot|LinkedInBot|Googlebot|bingbot|\bbot\b|crawler|spider/i;

const esc = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/**
 * Short notification link. People are sent to the app page (sign-in if
 * needed) and the open is counted; link-preview bots get a tiny page with
 * Open Graph tags and a generated card image (title and body only — the
 * same text as the notification, never private content).
 */
export async function GET(request: Request, ctx: RouteContext<"/n/[token]">) {
  const { token } = await ctx.params;
  const url = new URL(request.url);
  const link = isLinkToken(token)
    ? await db.notificationLink.findUnique({ where: { token } })
    : null;
  if (!link || link.expiresAt < new Date())
    return NextResponse.redirect(new URL("/ja/app", url.origin), 302);

  const target = new URL(`/${link.locale}${link.path}`, url.origin);
  const ua = request.headers.get("user-agent") ?? "";
  if (PREVIEW_BOT.test(ua)) {
    const t = await getTranslatorFor(link.locale, "notifications");
    const image = new URL(`/n/${token}/og`, url.origin).toString();
    const title = `${link.title} | ${t("preview.brand")}`;
    const html = `<!doctype html><html lang="${link.locale}"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(t("preview.brand"))}">
<meta property="og:title" content="${esc(link.title)}">
<meta property="og:description" content="${esc(link.body)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:url" content="${esc(url.toString())}">
<meta name="twitter:card" content="summary_large_image">
<meta name="robots" content="noindex">
</head><body><a href="${esc(target.toString())}">${esc(t("preview.open"))}</a></body></html>`;
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  await db.notificationLink.update({
    where: { token },
    data: { opens: { increment: 1 }, lastOpenedAt: new Date() },
  });
  return NextResponse.redirect(target, 302);
}
