import { describe, expect, it } from "vitest";
import {
  actionCategoryFor,
  PUSH_CATEGORY_IDS,
  pushMessageFor,
} from "./message";

const base = {
  token: "ExponentPushToken[abc]",
  kind: "NEWS",
  category: "news",
  emoji: "📰",
  title: "新しいニュースがあります",
  body: "AIS同窓会委員会からニュースが届きました。",
  path: "/app/news/p1",
};

describe("pushMessageFor", () => {
  it("builds a notification with the app's data", () => {
    const m = pushMessageFor({
      ...base,
      receipt: "Ab12Cd34",
      refId: "p1",
      badge: 3,
    });
    expect(m).toMatchObject({
      to: "ExponentPushToken[abc]",
      title: "📰 新しいニュースがあります",
      body: base.body,
      sound: "default",
      badge: 3,
      channelId: "news",
      threadId: "news",
      priority: "default",
      data: {
        v: 1,
        kind: "NEWS",
        category: "news",
        path: "/app/news/p1",
        receipt: "Ab12Cd34",
        refId: "p1",
      },
    });
    expect(m.categoryId).toBeUndefined();
    expect(m.collapseId).toBeUndefined();
  });
  it("leaves out what isn't known", () => {
    const m = pushMessageFor({
      ...base,
      receipt: null,
      refId: null,
      badge: null,
    });
    expect(m.badge).toBeUndefined();
    expect(m.data).not.toHaveProperty("receipt");
    expect(m.data).not.toHaveProperty("refId");
  });
  it("chats: high priority, reply actions, one notification per chat", () => {
    const m = pushMessageFor({
      ...base,
      kind: "CHAT_DIRECT",
      category: "chat",
      path: "/app/chat/g1",
      options: { collapseId: "chat-g1", threadId: "chat-g1", ttl: 86400 },
    });
    expect(m).toMatchObject({
      priority: "high",
      categoryId: PUSH_CATEGORY_IDS.chat,
      collapseId: "chat-g1",
      tag: "chat-g1",
      threadId: "chat-g1",
      ttl: 86400,
      channelId: "chat",
    });
  });
  it("interactive categories", () => {
    expect(actionCategoryFor("CHAT_MENTION")).toBe("chat_message");
    expect(actionCategoryFor("CHAT_GROUP")).toBe("chat_message");
    expect(actionCategoryFor("FOLLOW_REQUEST")).toBe("follow_request");
    expect(actionCategoryFor("NEWS")).toBeUndefined();
  });
  it("stays well under the 4 KB payload limit", () => {
    const m = pushMessageFor({
      ...base,
      receipt: "Ab12Cd34",
      refId: "x".repeat(64),
      badge: 99,
    });
    expect(Buffer.byteLength(JSON.stringify(m))).toBeLessThan(1024);
  });
});
