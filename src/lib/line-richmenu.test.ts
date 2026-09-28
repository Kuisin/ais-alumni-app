import { describe, expect, it } from "vitest";
import { LINE_POSTBACK } from "./line-reply";
import {
  DEFAULT_RICH_MENU_KEY,
  lineMenuKeyFor,
  NO_BADGES,
  RICH_MENU_ITEMS,
  RICH_MENU_REPLIES,
  RICH_MENU_SIZE,
  RICH_MENU_VARIANTS,
  replyBounds,
  richMenuAlias,
  richMenuBody,
  richMenuKey,
  tileBounds,
} from "./line-richmenu";

const labels = Object.fromEntries(
  [...RICH_MENU_REPLIES, ...RICH_MENU_ITEMS].map((i) => [
    i.key,
    `${i.key}-label`,
  ]),
) as Parameters<typeof richMenuBody>[1];

describe("LINE rich menu", () => {
  it("reply buttons and page tiles cover the whole image without gaps", () => {
    const bounds = [
      ...RICH_MENU_REPLIES.map((_, i) => replyBounds(i)),
      ...RICH_MENU_ITEMS.map((_, i) => tileBounds(i)),
    ];
    let area = 0;
    for (const b of bounds) {
      expect(b.x + b.width).toBeLessThanOrEqual(RICH_MENU_SIZE.width);
      expect(b.y + b.height).toBeLessThanOrEqual(RICH_MENU_SIZE.height);
      area += b.width * b.height;
    }
    expect(area).toBe(RICH_MENU_SIZE.width * RICH_MENU_SIZE.height);
    // The reply row is on top.
    expect(replyBounds(0).y).toBe(0);
    expect(tileBounds(0).y).toBe(replyBounds(0).height);
  });

  it("top row asks for a reply; the grid links app pages", () => {
    const body = richMenuBody("en", labels, "Menu");
    expect(body.selected).toBe(true);
    expect(body.areas).toHaveLength(8);
    expect(body.areas[0].action).toMatchObject({
      type: "postback",
      data: LINE_POSTBACK.chats,
      displayText: "chats-label",
    });
    expect(body.areas[1].action).toMatchObject({
      type: "postback",
      data: LINE_POSTBACK.news,
    });
    const first = body.areas[2].action;
    expect(first.type).toBe("uri");
    if (first.type === "uri")
      expect(first.uri).toMatch(/\/en\/app\/dashboard$/);
    for (const a of body.areas)
      expect(a.action.label.length).toBeLessThanOrEqual(20);
  });
});

describe("LINE rich menu variants", () => {
  it("one per language and unread state, with short, valid aliases", () => {
    const keys = RICH_MENU_VARIANTS.map((v) => richMenuKey(v.locale, v.badges));
    expect(new Set(keys).size).toBe(8);
    expect(keys).toContain("ja");
    expect(keys).toContain("en-chat-news");
    for (const k of keys) expect(richMenuAlias(k)).toMatch(/^[a-z0-9-]{1,32}$/);
    // The plain menus keep the aliases they had before variants.
    expect(richMenuAlias(DEFAULT_RICH_MENU_KEY)).toBe("ais-menu-ja");
    expect(richMenuAlias(richMenuKey("en", NO_BADGES))).toBe("ais-menu-en");
  });

  it("picks the member's language and dots; inactive members get none", () => {
    const both = { chats: true, news: true };
    expect(lineMenuKeyFor({ locale: "en", state: "ACTIVE" }, both)).toBe(
      "en-chat-news",
    );
    expect(
      lineMenuKeyFor(
        { locale: "ja", state: "ACTIVE" },
        { chats: false, news: true },
      ),
    ).toBe("ja-news");
    expect(
      lineMenuKeyFor({ locale: "ja", state: "PENDING_REVIEW" }, both),
    ).toBe("ja");
  });

  it("variants differ only in name, not in buttons", () => {
    const plain = richMenuBody("ja", labels, "Menu");
    const dotted = richMenuBody("ja", labels, "Menu", {
      chats: true,
      news: false,
    });
    expect(dotted.areas).toEqual(plain.areas);
    expect(dotted.name).not.toBe(plain.name);
  });
});
