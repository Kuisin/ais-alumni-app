import { describe, expect, it } from "vitest";
import { isReactionEmoji } from "./chat-emoji";

describe("isReactionEmoji", () => {
  it("accepts one emoji, with or without modifiers", () => {
    for (const e of ["👍", "❤️", "👍🏽", "🇯🇵", "👨‍👩‍👧‍👦", "1️⃣", " 🙏 "])
      expect(isReactionEmoji(e), e).toBe(true);
  });
  it("rejects text, several emoji and empty input", () => {
    for (const e of ["", " ", "a", "ok", "1", "👍👍", "👍a", "😀 😀"])
      expect(isReactionEmoji(e), e).toBe(false);
    expect(isReactionEmoji("👍".repeat(20))).toBe(false);
  });
});
