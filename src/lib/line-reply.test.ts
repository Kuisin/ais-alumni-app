import { describe, expect, it } from "vitest";
import {
  chatsReply,
  LINE_POSTBACK,
  lineReplyKind,
  newsReply,
  type ReplyChat,
  type ReplyPost,
} from "./line-reply";

const t = (k: string, v?: Record<string, string | number>) =>
  `${k}${v ? JSON.stringify(v) : ""}`;
const opts = {
  t,
  locale: "ja" as const,
  url: (p: string) => `https://ais.kai-lab.net${p}`,
};
const post = (i: number, unread = false, title = `Post ${i}`): ReplyPost => ({
  id: `p${i}`,
  title,
  publishedAt: new Date(Date.UTC(2026, 8, 28 - i)),
  unread,
});
const chat = (id: string, unread: number, mentioned = false): ReplyChat => ({
  id,
  name: `Chat ${id}`,
  unread,
  mentioned,
});
const text = (m: { text: string }[]) => m.map((x) => x.text).join("\n");

describe("lineReplyKind", () => {
  it("reads the rich menu postbacks", () => {
    expect(lineReplyKind({ postback: LINE_POSTBACK.chats })).toBe("chats");
    expect(lineReplyKind({ postback: LINE_POSTBACK.news })).toBe("news");
    expect(lineReplyKind({ postback: "other=1" })).toBeNull();
  });

  it("understands the same words typed in the chat", () => {
    expect(lineReplyKind({ text: " 未読 " })).toBe("chats");
    expect(lineReplyKind({ text: "Unread chats" })).toBe("chats");
    expect(lineReplyKind({ text: "ニュース一覧" })).toBe("news");
    expect(lineReplyKind({ text: "news" })).toBe("news");
    expect(lineReplyKind({ text: "こんにちは" })).toBeNull();
    expect(lineReplyKind({})).toBeNull();
  });
});

describe("chatsReply", () => {
  it("lists talks with unread messages: count, mention and link", () => {
    const out = text(
      chatsReply([chat("a", 7, true), chat("b", 0), chat("c", 1)], opts),
    );
    expect(out).toContain('chats.head{"talks":2,"count":8}');
    expect(out).toContain('■ Chat a　chats.count{"count":7}　chats.mentioned');
    expect(out).toContain("https://ais.kai-lab.net/ja/app/chat/a");
    expect(out).toContain('■ Chat c　chats.count{"count":1}');
    expect(out).not.toContain("Chat b");
    expect(out).toContain("chats.all ▶ https://ais.kai-lab.net/ja/app/chat");
  });

  it("says so when nothing is unread, with the chat list", () => {
    const out = text(chatsReply([chat("a", 0)], opts));
    expect(out).toContain("chats.none");
    expect(out).toContain("https://ais.kai-lab.net/ja/app/chat");
  });
});

describe("newsReply", () => {
  it("lists every post, unread first, then read", () => {
    const out = text(newsReply([post(1), post(2, true), post(3)], opts));
    expect(out).toContain('news.head{"count":3}');
    const unreadAt = out.indexOf('■ news.unread{"count":1}');
    const readAt = out.indexOf('■ news.read{"count":2}');
    expect(unreadAt).toBeGreaterThan(-1);
    expect(readAt).toBeGreaterThan(unreadAt);
    expect(out.indexOf("Post 2")).toBeGreaterThan(unreadAt);
    expect(out.indexOf("Post 2")).toBeLessThan(readAt);
    expect(out.indexOf("Post 1")).toBeGreaterThan(readAt);
    expect(out).toContain("https://ais.kai-lab.net/ja/app/news/p3");
  });

  it("leaves out an empty group", () => {
    const out = text(newsReply([post(1), post(2)], opts));
    expect(out).not.toContain("news.unread");
    expect(out).toContain('news.read{"count":2}');
  });

  it("says so when there is no news", () => {
    expect(text(newsReply([], opts))).toContain("news.none");
  });

  it("splits long lists over messages within LINE's limits", () => {
    const many = Array.from({ length: 200 }, (_, i) =>
      post(i, i < 20, `Title ${i} ${"長".repeat(80)}`),
    );
    const messages = newsReply(many, opts);
    expect(messages.length).toBeLessThanOrEqual(5);
    for (const m of messages) expect(m.text.length).toBeLessThanOrEqual(5000);
    // What doesn't fit is counted at the end, with the news page.
    const last = messages[messages.length - 1].text;
    expect(last).toMatch(
      /more\{"count":\d+\}\nhttps:\/\/ais\.kai-lab\.net\/ja\/app\/news$/,
    );
  });

  it("everything fits in one message when the list is short", () => {
    expect(newsReply([post(1), post(2)], opts)).toHaveLength(1);
  });
});
