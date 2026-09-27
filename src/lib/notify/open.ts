import { NextResponse } from "next/server";
import { getTranslatorFor } from "@/i18n/translator";
import { db } from "@/lib/db";
import { isLinkToken, isUserCode, linkText } from "./links";

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
 * Open a notification link (/n/<user code>/<token>, or /n/<token> without a
 * member). People are sent to the app page (sign-in if needed); the open is
 * counted and, with a member code, recorded as that member's read receipt.
 * Link-preview bots get a tiny page with Open Graph tags and the generated
 * card image (title and body only — the notification's own text) and count
 * as nothing. Texts and the page follow the member's current language
 * (Japanese without a member).
 */
export async function openNotificationLink(
  request: Request,
  token: string,
  userCode: string | null,
): Promise<Response> {
  const url = new URL(request.url);
  const link = isLinkToken(token)
    ? await db.notificationLink.findUnique({ where: { token } })
    : null;
  if (!link || link.expiresAt < new Date())
    return NextResponse.redirect(new URL("/ja/app", url.origin), 302);

  // The member this link was made for (their code): previews and the
  // redirect use their current language.
  const user =
    userCode && isUserCode(userCode)
      ? await db.user.findUnique({
          where: { linkCode: userCode },
          select: { id: true, locale: true },
        })
      : null;
  const locale = user?.locale ?? link.locale ?? "ja";
  const text = linkText(link, locale);

  const target = new URL(`/${locale}${link.path}`, url.origin);
  const ua = request.headers.get("user-agent") ?? "";
  if (PREVIEW_BOT.test(ua)) {
    const t = await getTranslatorFor(locale, "notifications");
    const image = new URL(`/n/${token}/og?l=${locale}`, url.origin).toString();
    const title = `${text.title} | ${t("preview.brand")}`;
    const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(t("preview.brand"))}">
<meta property="og:title" content="${esc(text.title)}">
<meta property="og:description" content="${esc(text.body)}">
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

  const now = new Date();
  await db.notificationLink.update({
    where: { id: link.id },
    data: { opens: { increment: 1 }, lastOpenedAt: now },
  });
  // Only members the link was sent to (a receipt exists) are recorded.
  if (user) {
    const where = { linkId_userId: { linkId: link.id, userId: user.id } };
    await db.notificationReceipt
      .update({
        where,
        data: { opens: { increment: 1 }, lastOpenedAt: now },
      })
      .then(() =>
        db.notificationReceipt.updateMany({
          where: { linkId: link.id, userId: user.id, openedAt: null },
          data: { openedAt: now },
        }),
      )
      .catch(() => undefined);
  }
  return NextResponse.redirect(target, 302);
}
