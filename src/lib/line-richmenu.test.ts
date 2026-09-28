import { describe, expect, it } from "vitest";
import { NEWS_POSTBACK } from "./line-news-reply";
import {
  RICH_MENU_ITEMS,
  RICH_MENU_REPLIES,
  RICH_MENU_SIZE,
  replyBounds,
  richMenuBody,
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
      data: NEWS_POSTBACK.unread,
      displayText: "unread-label",
    });
    expect(body.areas[1].action).toMatchObject({
      type: "postback",
      data: NEWS_POSTBACK.list,
    });
    const first = body.areas[2].action;
    expect(first.type).toBe("uri");
    if (first.type === "uri")
      expect(first.uri).toMatch(/\/en\/app\/dashboard$/);
    for (const a of body.areas)
      expect(a.action.label.length).toBeLessThanOrEqual(20);
  });
});
