import { describe, expect, it } from "vitest";
import { AccountState, FollowStatus, RoleKey } from "@/generated/prisma/enums";
import {
  ageOn,
  canRequestFollow,
  canViewPrivate,
  canViewProfile,
  isMinor,
  isTargeted,
  type Relationship,
  shouldAutoAccept,
  type Target,
  type Viewer,
} from "./core";

const NOW = new Date("2026-09-26T00:00:00Z");

const viewer = (o: Partial<Viewer> = {}): Viewer => ({
  id: "v",
  state: AccountState.ACTIVE,
  isAdmin: false,
  roles: [RoleKey.FORMER_STUDENT],
  currentTeacher: false,
  familyId: null,
  ...o,
});
const target = (o: Partial<Target> = {}): Target => ({
  id: "t",
  state: AccountState.ACTIVE,
  roles: [RoleKey.FORMER_STUDENT],
  dateOfBirth: new Date("1995-05-01"),
  familyId: null,
  ...o,
});
const rel = (o: Partial<Relationship> = {}): Relationship => ({
  follow: null,
  blocked: false,
  ...o,
});

describe("isMinor", () => {
  it("treats current students as minors regardless of age", () => {
    expect(
      isMinor(
        {
          roles: [RoleKey.CURRENT_STUDENT],
          dateOfBirth: new Date("1990-01-01"),
        },
        NOW,
      ),
    ).toBe(true);
  });
  it("uses the 18th birthday boundary", () => {
    expect(
      isMinor({ roles: [], dateOfBirth: new Date("2008-09-26") }, NOW),
    ).toBe(false);
    expect(
      isMinor({ roles: [], dateOfBirth: new Date("2008-09-27") }, NOW),
    ).toBe(true);
  });
  it("is false without DOB or student role", () => {
    expect(
      isMinor({ roles: [RoleKey.FORMER_PARENT], dateOfBirth: null }, NOW),
    ).toBe(false);
  });
  it("computes age", () => {
    expect(ageOn(new Date("2000-09-27"), NOW)).toBe(25);
  });
});

describe("canViewPrivate", () => {
  it("allows self", () => {
    expect(canViewPrivate(viewer({ id: "t" }), target(), rel(), NOW)).toBe(
      true,
    );
  });
  it("denies non-followers and pending requests", () => {
    expect(canViewPrivate(viewer(), target(), rel(), NOW)).toBe(false);
    expect(
      canViewPrivate(
        viewer(),
        target(),
        rel({ follow: FollowStatus.REQUESTED }),
        NOW,
      ),
    ).toBe(false);
  });
  it("allows accepted followers", () => {
    expect(
      canViewPrivate(
        viewer(),
        target(),
        rel({ follow: FollowStatus.ACCEPTED }),
        NOW,
      ),
    ).toBe(true);
  });
  it("is one-directional: the followee gains nothing", () => {
    // B (viewer) is followed by A (target) — rel is viewer→target, so null
    expect(canViewPrivate(viewer(), target(), rel({ follow: null }), NOW)).toBe(
      false,
    );
  });
  it("allows family members", () => {
    expect(
      canViewPrivate(
        viewer({ familyId: "f" }),
        target({ familyId: "f" }),
        rel(),
        NOW,
      ),
    ).toBe(true);
  });
  it("does not treat two null families as the same family", () => {
    expect(canViewPrivate(viewer(), target(), rel(), NOW)).toBe(false);
  });
  it("allows admins", () => {
    expect(
      canViewPrivate(viewer({ isAdmin: true }), target(), rel(), NOW),
    ).toBe(true);
  });
  it("denies when blocked even if following", () => {
    expect(
      canViewPrivate(
        viewer(),
        target(),
        rel({ follow: FollowStatus.ACCEPTED, blocked: true }),
        NOW,
      ),
    ).toBe(false);
  });
  it("denies non-ACTIVE viewers even with an accepted follow", () => {
    expect(
      canViewPrivate(
        viewer({ state: AccountState.PENDING_REVIEW }),
        target(),
        rel({ follow: FollowStatus.ACCEPTED }),
        NOW,
      ),
    ).toBe(false);
    expect(
      canViewPrivate(
        viewer({ state: AccountState.DEACTIVATED, isAdmin: true }),
        target(),
        rel(),
        NOW,
      ),
    ).toBe(false);
  });
});

describe("canViewProfile (minors, blocks, state)", () => {
  const minor = target({ roles: [RoleKey.CURRENT_STUDENT] });
  it("hides minors from non-family adults", () => {
    expect(canViewProfile(viewer(), minor, rel(), NOW)).toBe(false);
  });
  it("shows minors to teachers and family", () => {
    expect(
      canViewProfile(
        viewer({ roles: [RoleKey.TEACHER], currentTeacher: true }),
        minor,
        rel(),
        NOW,
      ),
    ).toBe(true);
    expect(
      canViewProfile(
        viewer({ familyId: "f" }),
        { ...minor, familyId: "f" },
        rel(),
        NOW,
      ),
    ).toBe(true);
  });
  it("hides blocked users and non-active targets", () => {
    expect(
      canViewProfile(viewer(), target(), rel({ blocked: true }), NOW),
    ).toBe(false);
    expect(
      canViewProfile(
        viewer(),
        target({ state: AccountState.DEACTIVATED }),
        rel(),
        NOW,
      ),
    ).toBe(false);
  });
});

describe("canRequestFollow", () => {
  it("gives former teachers no access to minors", () => {
    const minor = target({ roles: [RoleKey.CURRENT_STUDENT] });
    const former = viewer({ roles: [RoleKey.TEACHER], currentTeacher: false });
    expect(canViewProfile(former, minor, rel(), NOW)).toBe(false);
    expect(canRequestFollow(former, minor, rel(), NOW)).toMatchObject({
      reason: "minor",
    });
  });
  it("blocks adults following minors, except teachers", () => {
    const minor = target({ roles: [RoleKey.CURRENT_STUDENT] });
    expect(canRequestFollow(viewer(), minor, rel(), NOW)).toEqual({
      ok: false,
      reason: "minor",
    });
    expect(
      canRequestFollow(
        viewer({ roles: [RoleKey.TEACHER], currentTeacher: true }),
        minor,
        rel(),
        NOW,
      ),
    ).toEqual({ ok: true });
  });
  it("rejects self, duplicates, blocked and family", () => {
    expect(
      canRequestFollow(viewer({ id: "t" }), target(), rel(), NOW),
    ).toMatchObject({ reason: "self" });
    expect(
      canRequestFollow(
        viewer(),
        target(),
        rel({ follow: FollowStatus.REQUESTED }),
        NOW,
      ),
    ).toMatchObject({ reason: "already" });
    expect(
      canRequestFollow(viewer(), target(), rel({ blocked: true }), NOW),
    ).toMatchObject({ reason: "blocked" });
    expect(
      canRequestFollow(
        viewer({ familyId: "f" }),
        target({ familyId: "f" }),
        rel(),
        NOW,
      ),
    ).toMatchObject({ reason: "family" });
  });
});

describe("shouldAutoAccept", () => {
  it("accepts within ±1 year only when enabled", () => {
    expect(
      shouldAutoAccept(
        { autoAcceptSameYear: true, graduationYear: 2015 },
        { graduationYear: 2016 },
      ),
    ).toBe(true);
    expect(
      shouldAutoAccept(
        { autoAcceptSameYear: true, graduationYear: 2015 },
        { graduationYear: 2017 },
      ),
    ).toBe(false);
    expect(
      shouldAutoAccept(
        { autoAcceptSameYear: false, graduationYear: 2015 },
        { graduationYear: 2015 },
      ),
    ).toBe(false);
    expect(
      shouldAutoAccept(
        { autoAcceptSameYear: true, graduationYear: 2015 },
        { graduationYear: null },
      ),
    ).toBe(false);
  });
});

describe("isTargeted", () => {
  it("empty target list means everyone", () => {
    expect(isTargeted([], { roles: [], isAdmin: false })).toBe(true);
  });
  it("matches any overlapping role; admins see all", () => {
    expect(
      isTargeted([RoleKey.TEACHER], {
        roles: [RoleKey.FORMER_STUDENT],
        isAdmin: false,
      }),
    ).toBe(false);
    expect(
      isTargeted([RoleKey.TEACHER, RoleKey.FORMER_STUDENT], {
        roles: [RoleKey.FORMER_STUDENT],
        isAdmin: false,
      }),
    ).toBe(true);
    expect(isTargeted([RoleKey.TEACHER], { roles: [], isAdmin: true })).toBe(
      true,
    );
  });
});

describe("parent-managed child accounts", () => {
  it("are protected like minors", () => {
    expect(
      isMinor({
        roles: [RoleKey.FORMER_STUDENT],
        dateOfBirth: null,
        managed: true,
      }),
    ).toBe(true);
    expect(
      isMinor({
        roles: [RoleKey.FORMER_STUDENT],
        dateOfBirth: null,
        managed: false,
      }),
    ).toBe(false);
  });
});
