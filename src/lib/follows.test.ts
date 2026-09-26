import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/notify", () => ({ notify: vi.fn(), NOTIFY_USER_SELECT: {} }));

import { RoleKey } from "@/generated/prisma/enums";
import {
  FOLLOW_RATE_LIMIT,
  followRateWindowStart,
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
