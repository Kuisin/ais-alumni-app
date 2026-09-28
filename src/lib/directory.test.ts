import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import {
  AccountState,
  Division,
  LifeStage,
  RoleKey,
} from "@/generated/prisma/enums";
import { isMinor, type Viewer } from "@/lib/authz/core";
import {
  adultDobCutoff,
  buildDirectoryWhere,
  directoryQuery,
  hasActiveFilters,
  nameTokens,
  PUBLIC_CARD_SELECT,
  parseDirectoryFilters,
} from "./directory";

const NOW = new Date("2026-09-26T03:00:00Z");

const viewer = (o: Partial<Viewer> = {}): Viewer => ({
  id: "v",
  state: AccountState.ACTIVE,
  isAdmin: false,
  roles: [RoleKey.FORMER_STUDENT],
  currentTeacher: false,
  familyId: null,
  ...o,
});

describe("parseDirectoryFilters", () => {
  it("parses valid values", () => {
    expect(
      parseDirectoryFilters({
        q: "  Taro ",
        role: "FORMER_STUDENT",
        from: "2010",
        to: "2015",
        division: "HIGH_SCHOOL",
        stage: "WORKING",
        cursor: "ckabc1234567890",
      }),
    ).toEqual({
      q: "Taro",
      role: RoleKey.FORMER_STUDENT,
      yearFrom: 2010,
      yearTo: 2015,
      division: Division.HIGH_SCHOOL,
      stage: LifeStage.WORKING,
      cohort: null,
      cursor: "ckabc1234567890",
    });
  });

  it("drops invalid values", () => {
    const f = parseDirectoryFilters({
      q: "   ",
      role: "ADMIN",
      from: "20x0",
      to: "99999",
      division: "COLLEGE",
      stage: "",
      cursor: "'; drop table",
    });
    expect(f).toEqual({
      q: null,
      // an unknown 区分 falls back to the default (former students)
      role: RoleKey.FORMER_STUDENT,
      yearFrom: null,
      yearTo: null,
      division: null,
      stage: null,
      cohort: null,
      cursor: null,
    });
    expect(hasActiveFilters(f)).toBe(false);
  });

  it("swaps a reversed year range and takes the first of repeated params", () => {
    const f = parseDirectoryFilters({
      from: "2020",
      to: "2010",
      q: ["a", "b"],
    });
    expect([f.yearFrom, f.yearTo]).toEqual([2010, 2020]);
    expect(f.q).toBe("a");
  });

  it("defaults to former students; ?role=all shows everyone", () => {
    expect(parseDirectoryFilters({}).role).toBe(RoleKey.FORMER_STUDENT);
    expect(hasActiveFilters(parseDirectoryFilters({}))).toBe(false);
    const all = parseDirectoryFilters({ role: "all" });
    expect(all.role).toBeNull();
    expect(hasActiveFilters(all)).toBe(true);
    expect(directoryQuery(all)).toBe("?role=all");
  });

  it("caps the name query length", () => {
    expect(parseDirectoryFilters({ q: "x".repeat(500) }).q).toHaveLength(100);
  });
});

describe("directoryQuery", () => {
  it("round-trips filters and adds the cursor", () => {
    const f = parseDirectoryFilters({
      q: "山田",
      role: "TEACHER",
      from: "2000",
    });
    const qs = directoryQuery(f, "ckcursor0001");
    const back = parseDirectoryFilters(
      Object.fromEntries(new URLSearchParams(qs.slice(1))),
    );
    expect(back).toEqual({ ...f, cursor: "ckcursor0001" });
  });

  it("is empty without filters", () => {
    expect(directoryQuery(parseDirectoryFilters({}))).toBe("");
  });
});

describe("adultDobCutoff", () => {
  it("agrees with isMinor around the 18th birthday", () => {
    const cutoff = adultDobCutoff(NOW);
    const onCutoff = cutoff;
    const dayAfter = new Date(cutoff.getTime() + 86_400_000);
    expect(isMinor({ roles: [], dateOfBirth: onCutoff }, NOW)).toBe(false);
    expect(isMinor({ roles: [], dateOfBirth: dayAfter }, NOW)).toBe(true);
  });

  it("handles 29 February birthdays", () => {
    const dob = new Date(Date.UTC(2008, 1, 29));
    for (const now of [
      new Date(Date.UTC(2026, 1, 28, 12)),
      new Date(Date.UTC(2026, 2, 1, 12)),
    ]) {
      const adultByCutoff = dob <= adultDobCutoff(now);
      expect(adultByCutoff).toBe(
        !isMinor({ roles: [], dateOfBirth: dob }, now),
      );
    }
  });
});

describe("nameTokens", () => {
  it("splits on whitespace and caps the count", () => {
    expect(nameTokens(" Yamada  Taro ")).toEqual(["Yamada", "Taro"]);
    expect(nameTokens("a b c d e f g")).toHaveLength(5);
    expect(nameTokens(null)).toEqual([]);
  });
});

describe("buildDirectoryWhere", () => {
  const f = parseDirectoryFilters({
    q: "taro",
    role: "FORMER_STUDENT",
    from: "2010",
    division: "HIGH_SCHOOL",
  });

  it("restricts to ACTIVE, excludes blocked ids, and filters one role row", () => {
    const where = buildDirectoryWhere(f, {
      viewer: viewer(),
      blockedIds: ["b1"],
      now: NOW,
    });
    const and = where.AND as object[];
    expect(and).toContainEqual({ state: AccountState.ACTIVE });
    expect(and).toContainEqual({ id: { notIn: ["b1"] } });
    expect(and).toContainEqual({
      roles: {
        some: {
          role: RoleKey.FORMER_STUDENT,
          graduationOrLeaveYear: { gte: 2010 },
          lastDivision: Division.HIGH_SCHOOL,
        },
      },
    });
    expect(JSON.stringify(and)).toContain('"mode":"insensitive"');
  });

  it("excludes minors for ordinary members", () => {
    const where = buildDirectoryWhere(f, {
      viewer: viewer(),
      blockedIds: [],
      now: NOW,
    });
    expect(JSON.stringify(where)).toContain(RoleKey.CURRENT_STUDENT);
  });

  it("lets family members through the minor filter", () => {
    const where = buildDirectoryWhere(f, {
      viewer: viewer({ familyId: "fam" }),
      blockedIds: [],
      now: NOW,
    });
    expect(JSON.stringify(where)).toContain('"familyId":"fam"');
  });

  it("hides parents who opted out, except from admins", () => {
    const hidden = (v: ReturnType<typeof viewer>) =>
      JSON.stringify(
        buildDirectoryWhere(f, { viewer: v, blockedIds: [], now: NOW }),
      ).includes('"hideFromDirectory":true');
    expect(hidden(viewer())).toBe(true);
    expect(hidden(viewer({ isAdmin: true }))).toBe(false);
  });

  it("does not filter minors for teachers and admins", () => {
    for (const v of [
      viewer({ roles: [RoleKey.TEACHER], currentTeacher: true }),
      viewer({ isAdmin: true }),
    ]) {
      const where = buildDirectoryWhere(f, {
        viewer: v,
        blockedIds: [],
        now: NOW,
      });
      expect(JSON.stringify(where)).not.toContain(RoleKey.CURRENT_STUDENT);
    }
  });
});

describe("PUBLIC_CARD_SELECT", () => {
  it("never selects private-tier columns (§15)", () => {
    const s = JSON.stringify(PUBLIC_CARD_SELECT);
    for (const col of [
      "primaryEmail",
      "phone",
      "lineDisplayName",
      "lineUserId",
      "socialLinks",
      "currentStageDetail",
      "dateOfBirth",
      "studentIdNo",
      "schoolEmail",
    ]) {
      expect(s).not.toContain(col);
    }
  });
});
