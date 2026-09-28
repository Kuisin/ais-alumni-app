import { ImageResponse } from "next/og";
import type { Locale } from "@/generated/prisma/enums";
import { getTranslatorFor } from "@/i18n/translator";
import { loadNotoSansJp } from "@/lib/og/font";
import { OG_ICONS, type OgIconName } from "@/lib/og/icons";
import {
  RICH_MENU_ITEMS,
  RICH_MENU_REPLIES,
  RICH_MENU_SIZE,
  type RichMenuKey,
  replyBounds,
  tileBounds,
} from "./line-richmenu";

const BRAND = "#1e3a8a";
const BRAND_50 = "#eff4ff";

const ICONS: Record<RichMenuKey, OgIconName> = {
  chats: "bell-dot",
  newsList: "list",
  dashboard: "house",
  news: "newspaper",
  events: "calendar-days",
  chat: "messages-square",
  directory: "users",
  settings: "settings",
};

/** A lucide icon as inline SVG (stroke, like the app's icons). */
function Icon({
  name,
  size,
  color = BRAND,
}: {
  name: OgIconName;
  size: number;
  color?: string;
}) {
  return (
    // Drawn into a PNG (the label is next to it), not rendered as HTML.
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {OG_ICONS[name].map(([tag, attrs], i) => {
        const Tag = tag as "path";
        // biome-ignore lint/suspicious/noArrayIndexKey: static icon parts
        return <Tag key={i} {...attrs} />;
      })}
    </svg>
  );
}

/** Menu labels in one language (the app's own nav words). */
export async function richMenuLabels(
  locale: Locale,
): Promise<{ labels: Record<RichMenuKey, string>; chatBar: string }> {
  const t = await getTranslatorFor(locale, "common");
  const tl = await getTranslatorFor(locale, "line");
  const labels = Object.fromEntries([
    ...RICH_MENU_REPLIES.map((i) => [i.key, tl(`richMenu.replies.${i.key}`)]),
    ...RICH_MENU_ITEMS.map((i) => [i.key, t(`nav.${i.key}`)]),
  ]) as Record<RichMenuKey, string>;
  return { labels, chatBar: tl("richMenu.chatBar") };
}

/**
 * The 2500×1686 menu image: the two reply buttons across the top (brand
 * blue), then six page tiles (icon + label).
 */
export async function richMenuImage(locale: Locale): Promise<ImageResponse> {
  const { labels } = await richMenuLabels(locale);
  const font = await loadNotoSansJp(Object.values(labels).join(""));
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: "#ffffff",
        fontFamily: font ? "NotoSansJP" : "sans-serif",
      }}
    >
      {RICH_MENU_REPLIES.map((item, i) => {
        const b = replyBounds(i);
        return (
          <div
            key={item.key}
            style={{
              position: "absolute",
              left: b.x,
              top: b.y,
              width: b.width,
              height: b.height,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 40,
              background: BRAND,
              borderRight: i === 0 ? "4px solid #ffffff" : "none",
            }}
          >
            <Icon name={ICONS[item.key]} size={150} color="#ffffff" />
            <div
              style={{
                display: "flex",
                fontSize: 96,
                fontWeight: 700,
                color: "#ffffff",
              }}
            >
              {labels[item.key]}
            </div>
          </div>
        );
      })}
      {RICH_MENU_ITEMS.map((item, i) => {
        const b = tileBounds(i);
        return (
          <div
            key={item.key}
            style={{
              position: "absolute",
              left: b.x,
              top: b.y,
              width: b.width,
              height: b.height,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 24,
              borderRight: i % 3 < 2 ? "4px solid #e2e8f0" : "none",
              borderBottom: i < 3 ? "4px solid #e2e8f0" : "none",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 240,
                height: 240,
                borderRadius: 120,
                background: BRAND_50,
              }}
            >
              <Icon name={ICONS[item.key]} size={136} />
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 84,
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              {labels[item.key]}
            </div>
          </div>
        );
      })}
    </div>,
    {
      ...RICH_MENU_SIZE,
      fonts: font
        ? [{ name: "NotoSansJP", data: font, weight: 700, style: "normal" }]
        : undefined,
    },
  );
}
