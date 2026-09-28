import type { LineTextMessage } from "@/lib/line";

// Replies to the rich menu's 未読のお知らせ / ニュース一覧 buttons (and the
// same words typed in the chat). Replies are free: they don't count toward
// LINE's monthly message allowance, unlike pushes. Pure text building here;
// loading is in line-news-reply-db.ts.

export type NewsReplyKind = "unread" | "list";

/** Postback data sent by the rich menu buttons. */
export const NEWS_POSTBACK: Record<NewsReplyKind, string> = {
  unread: "news=unread",
  list: "news=list",
};

/** Which reply a postback or a typed message asks for (null: none). */
export function newsReplyKind(input: {
  postback?: string | null;
  text?: string | null;
}): NewsReplyKind | null {
  if (input.postback === NEWS_POSTBACK.unread) return "unread";
  if (input.postback === NEWS_POSTBACK.list) return "list";
  const text = input.text?.trim().toLowerCase().replace(/\s+/g, "");
  if (!text) return null;
  if (["未読", "未読のお知らせ", "unread", "unreadnews"].includes(text))
    return "unread";
  if (
    ["ニュース", "ニュース一覧", "news", "newslist", "お知らせ"].includes(text)
  )
    return "list";
  return null;
}

export type ReplyPost = {
  id: string;
  title: string;
  publishedAt: Date;
  unread: boolean;
};

type T = (key: string, values?: Record<string, string | number>) => string;

/** LINE text messages are limited to 5,000 characters. */
const MAX_TEXT = 5000;
/** Posts listed in one reply; the rest are on the news page. */
export const LIST_LIMIT = 15;

function date(d: Date, locale: "ja" | "en"): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "short",
    day: "numeric",
  }).format(d);
}

/**
 * The reply for one member: unread posts (newest first), or the latest
 * posts with unread ones marked; each with its link, then the news page.
 */
export function newsReplyText(
  kind: NewsReplyKind,
  posts: readonly ReplyPost[],
  opts: {
    t: T;
    locale: "ja" | "en";
    url: (path: string) => string;
  },
): LineTextMessage {
  const { t, locale, url } = opts;
  const all = url(`/${locale}/app/news`);
  const shown = (
    kind === "unread" ? posts.filter((p) => p.unread) : [...posts]
  ).slice(0, LIST_LIMIT);
  const total =
    kind === "unread" ? posts.filter((p) => p.unread).length : posts.length;

  if (shown.length === 0) {
    const empty = kind === "unread" ? t("unread.none") : t("list.none");
    return { type: "text", text: `${empty}\n\n${t("all")} ▶ ${all}` };
  }

  const head =
    kind === "unread"
      ? t("unread.head", { count: total })
      : t("list.head", { count: shown.length });
  const items = shown.map((p) => {
    const mark = kind === "list" && p.unread ? `${t("list.new")} ` : "";
    return `${mark}${p.title}（${date(p.publishedAt, locale)}）\n${url(`/${locale}/app/news/${p.id}`)}`;
  });
  const tail =
    total > shown.length
      ? `${t("more", { count: total - shown.length })}\n${all}`
      : `${t("all")} ▶ ${all}`;

  // Drop the oldest items if the text would pass LINE's limit.
  let body = items;
  let text = `${head}\n\n${body.join("\n\n")}\n\n${tail}`;
  while (text.length > MAX_TEXT && body.length > 1) {
    body = body.slice(0, -1);
    text = `${head}\n\n${body.join("\n\n")}\n\n${t("more", { count: total - body.length })}\n${all}`;
  }
  return { type: "text", text };
}
