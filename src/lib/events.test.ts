import { describe, expect, it } from "vitest";
import {
  answerSummary,
  checkRsvp,
  csvField,
  headcount,
  jstDayStart,
  mapLink,
  remainingSpots,
  reminderWindows,
  rsvpClosesAt,
  toCsv,
} from "./events";

const jst = (s: string) => new Date(`${s}+09:00`);

describe("reminderWindows", () => {
  // Cron runs at 00:00 UTC = 09:00 JST.
  const run = new Date("2026-10-01T00:00:00Z"); // Thu 1 Oct 09:00 JST

  it("computes JST day boundaries", () => {
    expect(jstDayStart(run).toISOString()).toBe("2026-09-30T15:00:00.000Z");
    // 23:30 UTC on 30 Sep is already 1 Oct in JST.
    expect(jstDayStart(new Date("2026-09-30T23:30:00Z")).toISOString()).toBe(
      "2026-09-30T15:00:00.000Z",
    );
  });

  it("1-day window is all of tomorrow (JST)", () => {
    const { d1 } = reminderWindows(run);
    expect(d1.from).toEqual(jst("2026-10-02T00:00:00"));
    expect(d1.to).toEqual(jst("2026-10-03T00:00:00"));
  });

  it("7-day window is the JST date one week ahead", () => {
    const { d7 } = reminderWindows(run);
    expect(d7.from).toEqual(jst("2026-10-08T00:00:00"));
    expect(d7.to).toEqual(jst("2026-10-09T00:00:00"));
  });

  it("windows do not overlap and consecutive runs tile time without gaps", () => {
    const a = reminderWindows(run);
    const b = reminderWindows(new Date(run.getTime() + 24 * 3600 * 1000));
    expect(a.d1.to <= a.d7.from).toBe(true);
    expect(b.d1.from).toEqual(a.d1.to);
    expect(b.d7.from).toEqual(a.d7.to);
  });

  it("is stable for a late cron invocation on the same JST day", () => {
    const late = reminderWindows(new Date("2026-10-01T10:00:00Z")); // 19:00 JST
    expect(late).toEqual(reminderWindows(run));
  });
});

describe("checkRsvp / capacity", () => {
  const now = jst("2026-10-01T12:00:00");
  const event = {
    startsAt: jst("2026-10-10T18:00:00"),
    rsvpDeadline: jst("2026-10-05T23:59:00"),
    capacity: 10,
  };

  it("accepts GOING that exactly fills capacity", () => {
    expect(
      checkRsvp({ event, answer: "GOING", guests: 2, othersGoing: 7, now }),
    ).toEqual({ ok: true });
  });

  it("rejects GOING that would exceed capacity (self + guests)", () => {
    expect(
      checkRsvp({ event, answer: "GOING", guests: 3, othersGoing: 7, now }),
    ).toEqual({
      ok: false,
      reason: "capacity",
    });
  });

  it("allows MAYBE / NOT_GOING when full", () => {
    expect(
      checkRsvp({ event, answer: "MAYBE", guests: 0, othersGoing: 10, now }).ok,
    ).toBe(true);
    expect(
      checkRsvp({ event, answer: "NOT_GOING", guests: 0, othersGoing: 10, now })
        .ok,
    ).toBe(true);
  });

  it("has no limit without capacity", () => {
    expect(
      checkRsvp({
        event: { ...event, capacity: null },
        answer: "GOING",
        guests: 5,
        othersGoing: 999,
        now,
      }).ok,
    ).toBe(true);
  });

  it("rejects after the deadline, or after start when there is no deadline", () => {
    const after = jst("2026-10-06T00:00:00");
    expect(
      checkRsvp({
        event,
        answer: "GOING",
        guests: 0,
        othersGoing: 0,
        now: after,
      }),
    ).toEqual({
      ok: false,
      reason: "closed",
    });
    const noDeadline = { ...event, rsvpDeadline: null };
    expect(
      checkRsvp({
        event: noDeadline,
        answer: "GOING",
        guests: 0,
        othersGoing: 0,
        now: after,
      }).ok,
    ).toBe(true);
    expect(
      checkRsvp({
        event: noDeadline,
        answer: "GOING",
        guests: 0,
        othersGoing: 0,
        now: jst("2026-10-10T18:00:00"),
      }).ok,
    ).toBe(false);
  });

  it("uses the event start if the deadline is after it", () => {
    const e = {
      startsAt: jst("2026-10-10T18:00:00"),
      rsvpDeadline: jst("2026-10-11T00:00:00"),
    };
    expect(rsvpClosesAt(e)).toEqual(e.startsAt);
  });

  it("rejects out-of-range guest counts", () => {
    expect(
      checkRsvp({ event, answer: "GOING", guests: 6, othersGoing: 0, now }),
    ).toEqual({
      ok: false,
      reason: "guests",
    });
    expect(
      checkRsvp({ event, answer: "GOING", guests: -1, othersGoing: 0, now }).ok,
    ).toBe(false);
  });

  it("headcount counts GOING people plus guests only", () => {
    const rsvps = [
      { answer: "GOING", guests: 2 },
      { answer: "GOING", guests: 0 },
      { answer: "MAYBE", guests: 3 },
      { answer: "NOT_GOING", guests: 0 },
    ] as const;
    expect(headcount(rsvps)).toBe(4);
    expect(remainingSpots(5, 4)).toBe(1);
    expect(remainingSpots(3, 4)).toBe(0);
    expect(remainingSpots(null, 4)).toBeNull();
    expect(answerSummary(rsvps)).toEqual({
      GOING: { count: 2, guests: 2 },
      MAYBE: { count: 1, guests: 3 },
      NOT_GOING: { count: 1, guests: 0 },
    });
  });
});

describe("helpers", () => {
  it("mapLink only trusts http(s) URLs", () => {
    expect(mapLink("javascript:alert(1)", null)).toBeNull();
    expect(mapLink("https://maps.example/x", "Nagoya")).toBe(
      "https://maps.example/x",
    );
    expect(mapLink(null, "名古屋 駅")).toBe(
      "https://www.google.com/maps/search/?api=1&query=%E5%90%8D%E5%8F%A4%E5%B1%8B%20%E9%A7%85",
    );
  });

  it("CSV quotes, escapes and prevents formula injection", () => {
    expect(csvField('a,"b"')).toBe('"a,""b"""');
    expect(csvField("=HYPERLINK()")).toBe("'=HYPERLINK()");
    expect(csvField(null)).toBe("");
    expect(toCsv([["名前", 1]])).toBe("﻿名前,1\r\n");
  });
});
