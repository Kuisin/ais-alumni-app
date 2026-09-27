import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/notify", () => ({ notify: vi.fn(), NOTIFY_USER_SELECT: {} }));

import { FollowStatus, RoleKey } from "@/generated/prisma/enums";
import {
  FOLLOW_RATE_LIMIT,
  followButtonState,
  followRateWindowStart,
  followsMe,
  formerStudentYear,
  isFollowRateLimited,
} from "./follows";

describe("follow rate limit", () => {
  it("allows up to 30 requests per 24h", () => {
    expect(FOLLOW_RATE_LIMIT).toBe(30);
    expect(isFollowRateLimited(29)).toBe(false);
    expect(isFollowRateLimited(30)).toBe(true);
  });
  it("uses a rolling 24h window", () => {
    const now = new Date("2026-09-26T12:00:00Z");
    expect(followRateWindowStart(now).toISOString()).toBe(
      "2026-09-25T12:00:00.000Z",
    );
  });
});

describe("formerStudentYear", () => {
  it("reads the FORMER_STUDENT graduation/leave year only", () => {
    expect(
      formerStudentYear([
        { role: RoleKey.TEACHER, graduationOrLeaveYear: null },
        { role: RoleKey.FORMER_STUDENT, graduationOrLeaveYear: 2015 },
      ]),
    ).toBe(2015);
    expect(
      formerStudentYear([
        { role: RoleKey.CURRENT_PARENT, graduationOrLeaveYear: 2015 },
      ]),
    ).toBeNull();
  });
});

describe("followButtonState (Instagram-style)", () => {
  const { ACCEPTED, REQUESTED } = FollowStatus;

  it("shows Following when my follow is accepted, whatever theirs is", () => {
    expect(followButtonState(ACCEPTED, null)).toBe("following");
    expect(followButtonState(ACCEPTED, ACCEPTED)).toBe("following");
    expect(followButtonState(ACCEPTED, REQUESTED)).toBe("following");
  });

  it("shows Requested while my request is pending", () => {
    expect(followButtonState(REQUESTED, null)).toBe("requested");
    expect(followButtonState(REQUESTED, ACCEPTED)).toBe("requested");
  });

  it("shows Follow back when only they follow me (accepted)", () => {
    expect(followButtonState(null, ACCEPTED)).toBe("followBack");
  });

  it("shows Follow otherwise, including their pending request", () => {
    expect(followButtonState(null, null)).toBe("none");
    expect(followButtonState(null, REQUESTED)).toBe("none");
  });

  it("shows no button when I may not request (minor, blocked, family…)", () => {
    expect(followButtonState(null, ACCEPTED, false)).toBeNull();
    expect(followButtonState(null, null, false)).toBeNull();
  });

  it("still lets me manage an existing follow when I couldn't request anew", () => {
    expect(followButtonState(ACCEPTED, null, false)).toBe("following");
    expect(followButtonState(REQUESTED, null, false)).toBe("requested");
  });
});

describe("followsMe", () => {
  it("is true only for their accepted follow", () => {
    expect(followsMe(FollowStatus.ACCEPTED)).toBe(true);
    expect(followsMe(FollowStatus.REQUESTED)).toBe(false);
    expect(followsMe(null)).toBe(false);
  });
});
