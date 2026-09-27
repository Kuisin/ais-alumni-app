import { describe, expect, it } from "vitest";
import {
  bestCandidates,
  hasResponded,
  isAttachmentKey,
  parseJsonField,
  pollInputSchema,
  reminderDue,
  scheduleInputSchema,
  tally,
} from "./news-hub";

describe("poll / 日程調整 input", () => {
  it("drops empty options and needs at least two poll choices", () => {
    const ok = parseJsonField(
      JSON.stringify({
        question: "Lunch?",
        options: [{ label: "Sushi" }, { label: " " }, { label: "Ramen" }],
      }),
      pollInputSchema,
    );
    expect(ok).toEqual({
      ok: true,
      value: {
        question: "Lunch?",
        multiple: false,
        options: [{ label: "Sushi" }, { label: "Ramen" }],
      },
    });
    const bad = parseJsonField(
      JSON.stringify({ question: "Lunch?", options: [{ label: "Sushi" }] }),
      pollInputSchema,
    );
    expect(bad).toEqual({ ok: false, error: "pollOptions" });
    expect(parseJsonField("", pollInputSchema)).toEqual({
      ok: true,
      value: null,
    });
  });

  it("checks candidate dates", () => {
    expect(
      scheduleInputSchema.safeParse({
        options: [{ startsAt: "2030-01-02T18:00" }],
      }).success,
    ).toBe(true);
    expect(
      scheduleInputSchema.safeParse({ options: [{ startsAt: "tomorrow" }] })
        .success,
    ).toBe(false);
  });
});

describe("results", () => {
  it("counts votes and picks the best candidates", () => {
    const counts = tally(
      ["a", "b", "c"],
      [
        { optionId: "a", answer: "YES" },
        { optionId: "a", answer: "NO" },
        { optionId: "b", answer: "YES" },
        { optionId: "b", answer: "MAYBE" },
        { optionId: "x", answer: "YES" },
      ],
    );
    expect(counts.get("a")).toEqual({ YES: 1, MAYBE: 0, NO: 1 });
    expect(bestCandidates(counts)).toEqual(["b"]);
    expect(bestCandidates(tally(["a"], []))).toEqual([]);
  });
});

describe("responses and reminders", () => {
  it("needs the confirmation and every poll", () => {
    const asks = { confirm: true, pollIds: ["p1", "p2"] };
    expect(
      hasResponded(asks, { confirmed: true, votedPollIds: new Set(["p1"]) }),
    ).toBe(false);
    expect(
      hasResponded(asks, {
        confirmed: true,
        votedPollIds: new Set(["p1", "p2"]),
      }),
    ).toBe(true);
  });

  it("reminds once, within a day of the deadline", () => {
    const now = new Date("2030-01-01T00:00:00Z");
    const in12h = new Date("2030-01-01T12:00:00Z");
    const in3d = new Date("2030-01-04T00:00:00Z");
    expect(reminderDue({ deadline: in12h, remindedAt: null }, now)).toBe(true);
    expect(reminderDue({ deadline: in3d, remindedAt: null }, now)).toBe(false);
    expect(reminderDue({ deadline: in12h, remindedAt: now }, now)).toBe(false);
    expect(
      reminderDue({ deadline: new Date("2029-12-31"), remindedAt: null }, now),
    ).toBe(false);
  });

  it("accepts only news attachment keys", () => {
    expect(isAttachmentKey("news-files/abc.pdf")).toBe(true);
    expect(isAttachmentKey("evidence/u/abc.pdf")).toBe(false);
    expect(isAttachmentKey("news-files/../x")).toBe(false);
  });
});
