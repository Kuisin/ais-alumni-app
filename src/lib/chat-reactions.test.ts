import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

const { summarizeReactions } = await import("./chat-reactions");

const row = (messageId: string, userId: string, emoji: string) => ({
  messageId,
  userId,
  emoji,
  user: { nameRomaji: `Name ${userId}`, nameKanji: null },
});

describe("summarizeReactions", () => {
  it("counts per emoji, in order of first use, and marks the member's own", () => {
    const got = summarizeReactions(
      [
        row("m1", "a", "👍"),
        row("m1", "b", "❤️"),
        row("m1", "me", "👍"),
        row("m2", "b", "🙏"),
      ],
      "me",
    );
    expect(got.get("m1")).toEqual([
      { emoji: "👍", count: 2, mine: true, names: ["Name a", "Name me"] },
      { emoji: "❤️", count: 1, mine: false, names: ["Name b"] },
    ]);
    expect(got.get("m2")).toEqual([
      { emoji: "🙏", count: 1, mine: false, names: ["Name b"] },
    ]);
    expect(got.get("m3")).toBeUndefined();
  });

  it("lists at most 10 names but counts everyone", () => {
    const rows = Array.from({ length: 13 }, (_, i) => row("m", `u${i}`, "🎉"));
    const [s] = summarizeReactions(rows, "x").get("m") ?? [];
    expect(s.count).toBe(13);
    expect(s.names).toHaveLength(10);
  });
});
