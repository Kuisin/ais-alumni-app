import { ImageResponse } from "next/og";
import { getTranslatorFor } from "@/i18n/translator";
import { db } from "@/lib/db";
import { NOTIFY_KINDS, type NotifyKind } from "@/lib/notify/catalog";
import { isLinkToken, linkText } from "@/lib/notify/links";

/** Japanese glyphs: a Noto Sans JP subset for just the text on the card. */
async function loadFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(
        `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&text=${encodeURIComponent(text)}`,
        { signal: AbortSignal.timeout(3000) },
      )
    ).text();
    const src = css.match(/src: url\((.+?)\) format/)?.[1];
    if (!src) return null;
    return await (
      await fetch(src, { signal: AbortSignal.timeout(3000) })
    ).arrayBuffer();
  } catch {
    return null;
  }
}

/**
 * Preview card for a notification link (1200×630): brand, category, the
 * notification's headline and sentence. No sign-in needed; nothing beyond
 * what the notification itself says, in the opener's language.
 */
export async function GET(request: Request, ctx: RouteContext<"/n/[key]/og">) {
  const { key: token } = await ctx.params;
  const link = isLinkToken(token)
    ? await db.notificationLink.findUnique({ where: { token } })
    : null;
  if (!link) return new Response("Not found", { status: 404 });
  // ?l= is the opener's language (set by the preview page).
  const l = new URL(request.url).searchParams.get("l");
  const locale = l === "en" || l === "ja" ? l : (link.locale ?? "ja");
  const { title, body } = linkText(link, locale);
  const t = await getTranslatorFor(locale, "notifications");
  const spec = NOTIFY_KINDS[link.kind as NotifyKind];
  const category = t(`categories.${link.category}`);
  const brand = t("preview.brand");
  const site = t("preview.site");
  const font = await loadFont(`${brand}${category}${title}${body}${site}🎓`);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#f1f5f9",
        fontFamily: font ? "NotoSansJP" : "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          background: "#1e3a8a",
          color: "#ffffff",
          padding: "28px 56px",
          fontSize: 40,
          fontWeight: 700,
        }}
      >
        <span>🎓</span>
        <span>{brand}</span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          margin: 40,
          padding: 48,
          background: "#ffffff",
          borderRadius: 32,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 30,
            color: "#1e3a8a",
            fontWeight: 700,
          }}
        >
          {category}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 20,
            fontSize: 64,
            fontWeight: 700,
            color: "#0f172a",
            lineHeight: 1.25,
          }}
        >
          {`${spec?.emoji ?? "🔔"} ${title}`}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 36,
            color: "#334155",
            lineHeight: 1.45,
          }}
        >
          {body}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: "auto",
            fontSize: 26,
            color: "#64748b",
          }}
        >
          {site}
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: font
        ? [{ name: "NotoSansJP", data: font, weight: 700, style: "normal" }]
        : undefined,
      headers: { "Cache-Control": "public, max-age=86400, immutable" },
    },
  );
}
