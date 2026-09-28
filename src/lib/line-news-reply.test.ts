import { describe, expect, it } from "vitest";
import {
  LIST_LIMIT,
  NEWS_POSTBACK,
  newsReplyKind,
  newsReplyText,
  type ReplyPost,
} from "./line-news-reply";

const t = (k: string, v?: Record<string, string | number>) =>
  `${k}${v ? JSON.stringify(v) : ""}`;
const opts = {
  t,
  locale: "ja" as const,
  url: (p: string) => `https://ais.kai-lab.net${p}`,
};
const post = (i: number, unread = false): ReplyPost => ({
  id: `p${i}`,
  title: `Post ${i}`,
  publishedAt: new Date(Date.UTC(2026, 8, 28 - i)),
  unread,
});

describe("newsReplyKind", () => {
  it("reads the rich menu postbacks", () => {
    expect(newsReplyKind({ postback: NEWS_POSTBACK.unread })).toBe("unread");
    expect(newsReplyKind({ postback: NEWS_POSTBACK.list })).toBe("list");
    expect(newsReplyKind({ postback: "other=1" })).toBeNull();
  });

  it("understands the same words typed in the chat", () => {
    expect(newsReplyKind({ text: " 未読 " })).toBe("unread");
    expect(newsReplyKind({ text: "Unread news" })).toBe("unread");
    expect(newsReplyKind({ text: "ニュース一覧" })).toBe("list");
    expect(newsReplyKind({ text: "news" })).toBe("list");
    expect(newsReplyKind({ text: "こんにちは" })).toBeNull();
    expect(newsReplyKind({})).toBeNull();
  });
});

describe("newsReplyText", () => {
  it("lists only unread posts, each with its link", () => {
    const { text } = newsReplyText(
      "unread",
      [post(1, true), post(2), post(3, true)],
      opts,
    );
    expect(text).toContain('unread.head{"count":2}');
    expect(text).toContain("Post 1");
    expect(text).toContain("https://ais.kai-lab.net/ja/app/news/p1");
    expect(text).toContain("Post 3");
    expect(text).not.toContain("Post 2");
    expect(text).toContain("https://ais.kai-lab.net/ja/app/news");
  });

  it("says so when nothing is unread, with the news page", () => {
    const { text } = newsReplyText("unread", [post(1)], opts);
    expect(text).toContain("unread.none");
    expect(text).toContain("https://ais.kai-lab.net/ja/app/news");
  });

  it("marks unread posts in the list", () => {
    const { text } = newsReplyText("list", [post(1, true), post(2)], opts);
    expect(text).toContain("list.new Post 1");
    expect(text).not.toContain("list.new Post 2");
  });

  it("caps the list and points to the rest in the app", () => {
    const many = Array.from({ length: LIST_LIMIT + 5 }, (_, i) => post(i));
    const { text } = newsReplyText("list", many, opts);
    expect(text).toContain(`Post ${LIST_LIMIT - 1}`);
    expect(text).not.toContain(`Post ${LIST_LIMIT}\n`);
    expect(text).toContain('more{"count":5}');
  });

  it("stays within LINE's 5,000 characters", () => {
    const long = Array.from({ length: LIST_LIMIT }, (_, i) => ({
      ...post(i),
      title: "長".repeat(600),
    }));
    const { text } = newsReplyText("list", long, opts);
    expect(text.length).toBeLessThanOrEqual(5000);
    expect(text).toContain("more");
  });
});
