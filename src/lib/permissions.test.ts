import { describe, expect, it } from "vitest";
import {
  broadcastRights,
  classOf,
  gradeForClassOf,
  type Holder,
  positionEligible,
  rightFor,
  schoolYearEnd,
  withinLimit,
} from "./permissions";

const h = (o: Partial<Holder> = {}): Holder => ({
  state: "ACTIVE",
  isAdmin: false,
  roles: [],
  positions: [],
  ...o,
});

describe("positions", () => {
  it("requires the matching role", () => {
    expect(positionEligible("TEACHER_MANAGER", ["TEACHER"])).toBe(true);
    expect(positionEligible("TEACHER_MANAGER", ["FORMER_STUDENT"])).toBe(false);
    expect(positionEligible("STUDENT_LEADER", ["CURRENT_STUDENT"])).toBe(true);
    expect(positionEligible("STUDENT_LEADER", ["FORMER_STUDENT"])).toBe(true);
    expect(positionEligible("STUDENT_LEADER", ["CURRENT_PARENT"])).toBe(false);
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
      positions: [{ position: "TEACHER_MANAGER", cohortYear: null }],
    });
    const rights = broadcastRights(mgr);
    expect(rightFor(rights, { scope: "ALL", targetRoles: [] })).toMatchObject({
      kind: "ANY",
      position: "TEACHER_MANAGER",
    });
    expect(
      rightFor(rights, { scope: "COHORT", cohortYear: 2010 }),
    ).not.toBeNull();
    expect(broadcastRights({ ...mgr, roles: ["FORMER_PARENT"] })).toEqual([]);
  });

  it("student leaders may only notify their own class", () => {
    const leader = h({
      roles: ["FORMER_STUDENT"],
      positions: [{ position: "STUDENT_LEADER", cohortYear: 2015 }],
    });
    const rights = broadcastRights(leader);
    expect(
      rightFor(rights, { scope: "COHORT", cohortYear: 2015 }),
    ).toMatchObject({ kind: "COHORT", cohortYear: 2015 });
    expect(rightFor(rights, { scope: "COHORT", cohortYear: 2016 })).toBeNull();
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

describe("class year", () => {
  it("school year starts in August (JST)", () => {
    expect(schoolYearEnd(new Date("2026-07-31T12:00:00Z"))).toBe(2026);
    expect(schoolYearEnd(new Date("2026-08-01T00:00:00Z"))).toBe(2027);
  });
  it("maps grades to graduation years and back", () => {
    const sept2026 = new Date("2026-09-27T00:00:00Z"); // school year 2026–27
    expect(classOf(12, sept2026)).toBe(2027);
    expect(classOf(0, sept2026)).toBe(2039);
    expect(gradeForClassOf(2030, sept2026)).toBe(9);
    expect(gradeForClassOf(2015, sept2026)).toBeNull();
  });
});
