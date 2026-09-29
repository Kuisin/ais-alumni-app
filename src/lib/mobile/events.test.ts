import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/session", () => ({
  AuthError: class AuthError extends Error {},
  getCurrentUser: vi.fn(),
}));
vi.mock("@/lib/storage", () => ({ signedFileUrl: vi.fn() }));
vi.mock("@/lib/news", () => ({ EVENTS_PAGE_SIZE: 20 }));
vi.mock("@/app/actions/events", () => ({ rsvpAction: vi.fn() }));
vi.mock("@/lib/broadcasts", () => ({ getNewsScope: vi.fn() }));
vi.mock("@/lib/event-staff", () => ({ canCheckIn: vi.fn() }));
vi.mock("@/lib/news-visibility", () => ({
  filterByAudience: vi.fn(),
  inAudience: vi.fn(),
}));
vi.mock("@/lib/sender", () => ({
  senderLabel: vi.fn(),
  senderLabels: vi.fn(),
}));

import {
  deadlineLeft,
  EventListQuery,
  eventTimeWhere,
  RsvpBody,
  rsvpError,
} from "./events";

describe("EventListQuery", () => {
  it("reads ?tab= and ?page= like the website", () => {
    expect(EventListQuery.parse({})).toEqual({ tab: "upcoming", page: 1 });
    expect(EventListQuery.parse({ tab: "past", page: "2" })).toEqual({
      tab: "past",
      page: 2,
    });
    expect(EventListQuery.parse({ tab: "PAST" }).tab).toBe("upcoming");
    expect(EventListQuery.parse({ page: "1000" }).page).toBe(1000);
  });
  it("falls back to page 1 for anything else", () => {
    for (const page of ["0", "-1", "1001", "1.5", "abc", ""])
      expect(EventListQuery.parse({ page }).page).toBe(1);
  });
});

describe("eventTimeWhere", () => {
  const now = new Date("2026-10-01T00:00:00Z");
  it("keeps events in progress under upcoming", () => {
    expect(eventTimeWhere("upcoming", now)).toEqual({
      OR: [{ startsAt: { gte: now } }, { endsAt: { gte: now } }],
    });
  });
  it("past = started and (no end or ended)", () => {
    expect(eventTimeWhere("past", now)).toEqual({
      startsAt: { lt: now },
      OR: [{ endsAt: null }, { endsAt: { lt: now } }],
    });
  });
});

describe("deadlineLeft", () => {
  const now = new Date("2026-10-01T00:00:00Z").getTime();
  const at = (ms: number) => new Date(now + ms);
  const HOUR = 60 * 60 * 1000;
  it("counts whole days from one day on", () => {
    expect(deadlineLeft(at(13.5 * 24 * HOUR), true, now)).toEqual({
      unit: "days",
      count: 13,
    });
    expect(deadlineLeft(at(24 * HOUR), true, now)).toEqual({
      unit: "days",
      count: 1,
    });
  });
  it("rounds hours up under a day, at least 1", () => {
    expect(deadlineLeft(at(23.5 * HOUR), true, now)).toEqual({
      unit: "hours",
      count: 24,
    });
    expect(deadlineLeft(at(10 * 60 * 1000), true, now)).toEqual({
      unit: "hours",
      count: 1,
    });
  });
  it("is null once closed or past", () => {
    expect(deadlineLeft(at(5 * HOUR), false, now)).toBeNull();
    expect(deadlineLeft(at(-HOUR), true, now)).toBeNull();
    expect(deadlineLeft(at(0), true, now)).toBeNull();
  });
});

describe("RsvpBody", () => {
  it("accepts the three answers and 0–5 guests", () => {
    expect(RsvpBody.parse({ answer: "GOING" })).toEqual({
      answer: "GOING",
      guests: 0,
    });
    expect(RsvpBody.parse({ answer: "MAYBE", guests: 5 }).guests).toBe(5);
  });
  it("rejects anything else", () => {
    expect(RsvpBody.safeParse({ answer: "YES" }).success).toBe(false);
    expect(RsvpBody.safeParse({ answer: "GOING", guests: 6 }).success).toBe(
      false,
    );
    expect(RsvpBody.safeParse({ answer: "GOING", guests: 1.5 }).success).toBe(
      false,
    );
  });
});

describe("rsvpError", () => {
  it("maps the RSVP action's refusals to API errors", () => {
    const cases = [
      ["closed", 409, "closed"],
      ["capacity", 409, "capacity"],
      ["guests", 400, "guests"],
      ["validation", 400, "invalid"],
      ["notFound", 404, "not_found"],
      ["forbidden", 403, "forbidden"],
      ["generic", 500, "server_error"],
    ] as const;
    for (const [error, status, code] of cases)
      expect(rsvpError(error)).toMatchObject({ status, code });
  });
});
