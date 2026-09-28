import { describe, expect, it } from "vitest";
import { daily, EVERY_MINUTE, lastSlot, yearly } from "./schedule";

/** A JST wall-clock time as a Date. */
const jst = (s: string) => new Date(`${s}+09:00`);

describe("lastSlot", () => {
  it("every minute: always due (no slot)", () => {
    expect(lastSlot(EVERY_MINUTE, jst("2026-09-28T12:00:00"))).toBeNull();
  });

  it("daily: today's time once passed, else yesterday's (JST)", () => {
    const at9 = daily("09:00");
    expect(lastSlot(at9, jst("2026-09-28T09:00:00"))).toEqual(
      jst("2026-09-28T09:00:00"),
    );
    expect(lastSlot(at9, jst("2026-09-28T12:34:00"))).toEqual(
      jst("2026-09-28T09:00:00"),
    );
    expect(lastSlot(at9, jst("2026-09-28T08:59:59"))).toEqual(
      jst("2026-09-27T09:00:00"),
    );
    // 00:05 JST is the previous UTC day.
    expect(lastSlot(daily("00:05"), jst("2026-09-28T00:10:00"))).toEqual(
      jst("2026-09-28T00:05:00"),
    );
    expect(lastSlot(daily("20:00"), jst("2026-01-01T03:00:00"))).toEqual(
      jst("2025-12-31T20:00:00"),
    );
  });

  it("yearly: this year's date once passed, else last year's", () => {
    const april1 = yearly("04-01 09:00");
    expect(lastSlot(april1, jst("2026-09-28T12:00:00"))).toEqual(
      jst("2026-04-01T09:00:00"),
    );
    expect(lastSlot(april1, jst("2026-04-01T08:00:00"))).toEqual(
      jst("2025-04-01T09:00:00"),
    );
    expect(lastSlot(april1, jst("2026-04-01T09:00:00"))).toEqual(
      jst("2026-04-01T09:00:00"),
    );
  });

  it("rejects malformed times", () => {
    expect(() => lastSlot(daily("9:00"), new Date())).toThrow();
    expect(() => lastSlot(yearly("4-1 09:00"), new Date())).toThrow();
  });
});
