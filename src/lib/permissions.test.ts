import { describe, expect, it } from "vitest";
import {
  broadcastRights,
  type Holder,
  hasStaffAccess,
  positionEligible,
  rightFor,
  staffAccess,
  withinLimit,
} from "./permissions";

const h = (o: Partial<Holder> = {}): Holder => ({
  state: "ACTIVE",
  isAdmin: false,
  roles: [],
  currentTeacher: false,
  positions: [],
  ...o,
});

describe("positions", () => {
  it("requires the matching role", () => {
    expect(positionEligible("TEACHER_MANAGER", ["TEACHER"], true)).toBe(true);
    expect(positionEligible("TEACHER_MANAGER", ["TEACHER"], false)).toBe(false);
    expect(positionEligible("TEACHER_MANAGER", ["FORMER_STUDENT"], false)).toBe(
      false,
    );
    expect(positionEligible("STUDENT_LEADER", ["CURRENT_STUDENT"], false)).toBe(
      true,
    );
    expect(positionEligible("STUDENT_LEADER", ["FORMER_STUDENT"], false)).toBe(
      true,
    );
    expect(positionEligible("STUDENT_LEADER", ["CURRENT_PARENT"], false)).toBe(
      false,
    );
  });
});

describe("broadcast rights", () => {
  it("ordinary members and inactive holders have none", () => {
    expect(broadcastRights(h({ roles: ["FORMER_STUDENT"] }))).toEqual([]);
    expect(broadcastRights(h({ state: "DEACTIVATED", isAdmin: true }))).toEqual(
      [],
    );
  });

  it("teacher managers may notify anyone; without the teacher role nothing", () => {
    const mgr = h({
      roles: ["TEACHER"],
      currentTeacher: true,
      positions: [{ position: "TEACHER_MANAGER", cohortId: null }],
    });
    const rights = broadcastRights(mgr);
    expect(rightFor(rights, { scope: "ALL", targetRoles: [] })).toMatchObject({
      kind: "ANY",
      position: "TEACHER_MANAGER",
    });
    expect(
      rightFor(rights, { scope: "COHORT", cohortId: "c1" }),
    ).not.toBeNull();
    expect(broadcastRights({ ...mgr, roles: ["FORMER_PARENT"] })).toEqual([]);
  });

  it("student leaders may only notify their own class", () => {
    const leader = h({
      roles: ["FORMER_STUDENT"],
      positions: [{ position: "STUDENT_LEADER", cohortId: "c5" }],
    });
    const rights = broadcastRights(leader);
    expect(rightFor(rights, { scope: "COHORT", cohortId: "c5" })).toMatchObject(
      { kind: "COHORT", cohortId: "c5" },
    );
    expect(rightFor(rights, { scope: "COHORT", cohortId: "c6" })).toBeNull();
    expect(rightFor(rights, { scope: "ALL", targetRoles: [] })).toBeNull();
  });

  it("admins may notify anyone", () => {
    expect(
      rightFor(broadcastRights(h({ isAdmin: true })), {
        scope: "ALL",
        targetRoles: ["TEACHER"],
      }),
    ).toMatchObject({ position: null });
  });
});

describe("limits", () => {
  const now = new Date("2026-09-27T00:00:00Z");
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);
  it("leaders get 5 per 7 days, managers 20 per day, admins unlimited", () => {
    expect(withinLimit("STUDENT_LEADER", [1, 2, 3, 4].map(daysAgo), now)).toBe(
      true,
    );
    expect(
      withinLimit("STUDENT_LEADER", [1, 2, 3, 4, 5].map(daysAgo), now),
    ).toBe(false);
    expect(
      withinLimit("STUDENT_LEADER", [8, 9, 10, 11, 12].map(daysAgo), now),
    ).toBe(true);
    expect(
      withinLimit("TEACHER_MANAGER", Array(20).fill(daysAgo(0.5)), now),
    ).toBe(false);
    expect(withinLimit(null, Array(100).fill(now), now)).toBe(true);
  });
});

describe("staff access (admin mode)", () => {
  const member = {
    state: "ACTIVE" as const,
    isAdmin: false,
    roles: ["FORMER_STUDENT" as const],
    currentTeacher: false,
    positions: [],
  };
  it("plain members have no admin mode", () => {
    expect(hasStaffAccess(staffAccess(member))).toBe(false);
  });
  it("teacher registrars get the teachers page only", () => {
    const a = staffAccess({
      ...member,
      positions: [{ position: "TEACHER_REGISTRAR", cohortId: null }],
    });
    expect(a).toEqual({ admin: false, broadcast: false, teachers: true });
    expect(
      positionEligible("TEACHER_REGISTRAR", ["CURRENT_PARENT"], false),
    ).toBe(true);
  });
  it("student leaders get the notification page; admins get everything", () => {
    expect(
      staffAccess({
        ...member,
        positions: [{ position: "STUDENT_LEADER", cohortId: "c1" }],
      }),
    ).toEqual({ admin: false, broadcast: true, teachers: false });
    expect(staffAccess({ ...member, isAdmin: true })).toEqual({
      admin: true,
      broadcast: true,
      teachers: true,
    });
    expect(
      hasStaffAccess(
        staffAccess({ ...member, isAdmin: true, state: "PENDING_REVIEW" }),
      ),
    ).toBe(false);
  });
});
