import { describe, expect, it } from "vitest";
import {
  displayName,
  formatDateTime,
  localized,
  parseJstLocal,
  toJstLocalInput,
} from "./format";

describe("format (§12)", () => {
  const d = new Date("2026-10-03T05:00:00Z"); // 14:00 JST
  it("formats Japanese dates", () => {
    expect(formatDateTime(d, "ja")).toBe("2026年10月3日（土） 14:00");
  });
  it("formats English dates", () => {
    expect(formatDateTime(d, "en")).toBe("Sat, Oct 3, 2026, 2:00 PM");
  });
  it("round-trips JST datetime-local values", () => {
    expect(parseJstLocal("2026-10-03T14:00").toISOString()).toBe(
      "2026-10-03T05:00:00.000Z",
    );
    expect(toJstLocalInput(d)).toBe("2026-10-03T14:00");
  });
  it("picks names by locale", () => {
    expect(
      displayName({ nameRomaji: "Taro Yamada", nameKanji: "山田太郎" }, "ja"),
    ).toBe("山田太郎");
    expect(
      displayName({ nameRomaji: "Taro Yamada", nameKanji: "山田太郎" }, "en"),
    ).toBe("Taro Yamada");
    expect(
      displayName({ nameRomaji: "Taro Yamada", nameKanji: null }, "ja"),
    ).toBe("Taro Yamada");
  });
  it("falls back to the other language with a flag", () => {
    expect(localized(null, "Hello", "ja")).toEqual({
      text: "Hello",
      fallback: "en",
    });
    expect(localized("こんにちは", "Hello", "ja")).toEqual({
      text: "こんにちは",
      fallback: null,
    });
    expect(localized("こんにちは", "  ", "en")).toEqual({
      text: "こんにちは",
      fallback: "ja",
    });
  });
});
