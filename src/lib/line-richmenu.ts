import type { Locale } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { lineConfigured, lineRequest } from "@/lib/line";
import { LINE_POSTBACK } from "@/lib/line-reply";
import { publicUrl } from "@/lib/urls";

/**
 * The Official Account's rich menu, shown under the chat instead of the
 * keyboard (selected: true): two buttons on top that ask for unread chats /
 * the news list — answered by a free reply (line-reply.ts), not a push — and a
 * 3 × 2 grid of app pages below. One menu per language
 * (aliases ais-menu-ja / ais-menu-en); Japanese is the default, members
 * who use English get theirs linked. Installed from 管理 → LINEメニュー
 * (installRichMenus); kept in step with the member's language
 * (syncRichMenu).
 */

export const RICH_MENU_ITEMS = [
  { key: "dashboard", path: "/app/dashboard" },
  { key: "news", path: "/app/news" },
  { key: "events", path: "/app/events" },
  { key: "chat", path: "/app/chat" },
  { key: "directory", path: "/app/directory" },
  { key: "settings", path: "/app/settings" },
] as const;

/** Top row: buttons that post back and get a reply in the chat. */
export const RICH_MENU_REPLIES = [
  { key: "chats", data: LINE_POSTBACK.chats },
  { key: "newsList", data: LINE_POSTBACK.news },
] as const;

export type RichMenuPageKey = (typeof RICH_MENU_ITEMS)[number]["key"];
export type RichMenuReplyKey = (typeof RICH_MENU_REPLIES)[number]["key"];
export type RichMenuKey = RichMenuPageKey | RichMenuReplyKey;

export const RICH_MENU_SIZE = { width: 2500, height: 1686 } as const;
const COLS = 3;
/** One row of reply buttons, then two rows of pages. */
const ROWS = 3;

export const RICH_MENU_ALIAS: Record<Locale, string> = {
  ja: "ais-menu-ja",
  en: "ais-menu-en",
};

function rowBounds(row: number) {
  const y0 = Math.round((RICH_MENU_SIZE.height * row) / ROWS);
  const y1 = Math.round((RICH_MENU_SIZE.height * (row + 1)) / ROWS);
  return { y: y0, height: y1 - y0 };
}

/** Reply button bounds: the top row, split in two. */
export function replyBounds(i: number) {
  const x0 = Math.round((RICH_MENU_SIZE.width * i) / RICH_MENU_REPLIES.length);
  const x1 = Math.round(
    (RICH_MENU_SIZE.width * (i + 1)) / RICH_MENU_REPLIES.length,
  );
  return { x: x0, ...rowBounds(0), width: x1 - x0 };
}

/** Page tile bounds (3 × 2 under the reply row), whole pixels, no gaps. */
export function tileBounds(i: number) {
  const col = i % COLS;
  const row = Math.floor(i / COLS) + 1;
  const x0 = Math.round((RICH_MENU_SIZE.width * col) / COLS);
  const x1 = Math.round((RICH_MENU_SIZE.width * (col + 1)) / COLS);
  const y0 = Math.round((RICH_MENU_SIZE.height * row) / ROWS);
  const y1 = Math.round((RICH_MENU_SIZE.height * (row + 1)) / ROWS);
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/** The rich menu object (Messaging API) for one language. */
export function richMenuBody(
  locale: Locale,
  labels: Record<RichMenuKey, string>,
  chatBarText: string,
) {
  return {
    size: RICH_MENU_SIZE,
    selected: true,
    name: `AIS Alumni menu (${locale})`,
    chatBarText,
    areas: [
      // The label also shows in the chat as the member's message.
      ...RICH_MENU_REPLIES.map((item, i) => ({
        bounds: replyBounds(i),
        action: {
          type: "postback" as const,
          label: labels[item.key].slice(0, 20),
          data: item.data,
          displayText: labels[item.key],
        },
      })),
      ...RICH_MENU_ITEMS.map((item, i) => ({
        bounds: tileBounds(i),
        action: {
          type: "uri" as const,
          label: labels[item.key].slice(0, 20),
          uri: publicUrl(`/${locale}${item.path}`),
        },
      })),
    ],
  };
}

async function aliasTarget(alias: string): Promise<string | null> {
  try {
    const r = await lineRequest<{ richMenuId: string }>(
      "GET",
      `/richmenu/alias/${alias}`,
    );
    return r.richMenuId ?? null;
  } catch {
    return null;
  }
}

/**
 * Create both menus, upload their images, point the aliases at them, make
 * Japanese the default, link English users, then delete older menus.
 */
export async function installRichMenus(
  build: (locale: Locale) => Promise<{
    body: ReturnType<typeof richMenuBody>;
    image: ArrayBuffer;
  }>,
): Promise<{ ids: Record<Locale, string>; linkedEn: number; removed: number }> {
  const ids = {} as Record<Locale, string>;
  for (const locale of ["ja", "en"] as const) {
    const { body, image } = await build(locale);
    await lineRequest("POST", "/richmenu/validate", body);
    const { richMenuId } = await lineRequest<{ richMenuId: string }>(
      "POST",
      "/richmenu",
      body,
    );
    await lineRequest("POST", `/richmenu/${richMenuId}/content`, image, {
      data: true,
      contentType: "image/png",
    });
    const alias = RICH_MENU_ALIAS[locale];
    if (await aliasTarget(alias))
      await lineRequest("POST", `/richmenu/alias/${alias}`, { richMenuId });
    else
      await lineRequest("POST", "/richmenu/alias", {
        richMenuAliasId: alias,
        richMenuId,
      });
    ids[locale] = richMenuId;
  }
  await lineRequest("POST", `/user/all/richmenu/${ids.ja}`);

  const enUsers = await db.user.findMany({
    where: { locale: "en", lineUserId: { not: null } },
    select: { lineUserId: true },
  });
  const userIds = enUsers.map((u) => u.lineUserId as string);
  for (let i = 0; i < userIds.length; i += 500) {
    await lineRequest("POST", "/richmenu/bulk/link", {
      richMenuId: ids.en,
      userIds: userIds.slice(i, i + 500),
    });
  }

  const { richmenus } = await lineRequest<{
    richmenus: { richMenuId: string }[];
  }>("GET", "/richmenu/list");
  const keep = new Set(Object.values(ids));
  let removed = 0;
  for (const m of richmenus ?? []) {
    if (keep.has(m.richMenuId)) continue;
    await lineRequest("DELETE", `/richmenu/${m.richMenuId}`).catch(() => {});
    removed++;
  }
  return { ids, linkedEn: userIds.length, removed };
}

/** Current state for the admin page (null when not installed/configured). */
export async function richMenuStatus(): Promise<{
  configured: boolean;
  installed: Record<Locale, string | null>;
  defaultId: string | null;
}> {
  if (!lineConfigured())
    return {
      configured: false,
      installed: { ja: null, en: null },
      defaultId: null,
    };
  const [ja, en, def] = await Promise.all([
    aliasTarget(RICH_MENU_ALIAS.ja),
    aliasTarget(RICH_MENU_ALIAS.en),
    lineRequest<{ richMenuId: string }>("GET", "/user/all/richmenu")
      .then((r) => r.richMenuId ?? null)
      .catch(() => null),
  ]);
  return { configured: true, installed: { ja, en }, defaultId: def };
}

/**
 * Give this LINE user the menu in their language (English linked, Japanese
 * = the default). Best effort: never throws.
 */
export async function syncRichMenu(
  lineUserId: string | null | undefined,
  locale: Locale,
): Promise<void> {
  if (!lineUserId || !lineConfigured()) return;
  try {
    if (locale === "en") {
      const id = await aliasTarget(RICH_MENU_ALIAS.en);
      if (id) await lineRequest("POST", `/user/${lineUserId}/richmenu/${id}`);
    } else {
      await lineRequest("DELETE", `/user/${lineUserId}/richmenu`).catch(
        () => {},
      );
    }
  } catch (e) {
    console.error("[line-richmenu] sync failed", e);
  }
}
