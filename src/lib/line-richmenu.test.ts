import { describe, expect, it } from "vitest";
import {
  RICH_MENU_ITEMS,
  RICH_MENU_SIZE,
  richMenuBody,
  tileBounds,
} from "./line-richmenu";

describe("LINE rich menu", () => {
  it("tiles cover the whole image without gaps", () => {
    let area = 0;
    for (let i = 0; i < RICH_MENU_ITEMS.length; i++) {
      const b = tileBounds(i);
      expect(b.x + b.width).toBeLessThanOrEqual(RICH_MENU_SIZE.width);
      expect(b.y + b.height).toBeLessThanOrEqual(RICH_MENU_SIZE.height);
      area += b.width * b.height;
    }
    expect(area).toBe(RICH_MENU_SIZE.width * RICH_MENU_SIZE.height);
  });

  it("opens the menu instead of the keyboard and links app pages", () => {
    const labels = Object.fromEntries(
      RICH_MENU_ITEMS.map((i) => [i.key, `${i.key}-label`]),
    ) as Parameters<typeof richMenuBody>[1];
    const body = richMenuBody("en", labels, "Menu");
    expect(body.selected).toBe(true);
    expect(body.areas).toHaveLength(6);
    expect(body.areas[0].action.uri).toMatch(/\/en\/app\/dashboard$/);
    for (const a of body.areas)
      expect(a.action.label.length).toBeLessThanOrEqual(20);
  });
});
