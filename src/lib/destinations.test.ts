import { describe, expect, it } from "vitest";
import { pathOf, topNames } from "./destinations";

const now = new Date("2026-09-27T00:00:00Z");

describe("destinations (進路)", () => {
  it("takes the first school per level and the current job", () => {
    const p = pathOf(
      [
        {
          level: "HIGH_SCHOOL",
          school: "B High",
          startYear: 2012,
          endYear: 2015,
        },
        {
          level: "JUNIOR_HIGH",
          school: "A JHS",
          startYear: 2009,
          endYear: 2012,
        },
        {
          level: "UNIVERSITY",
          school: "C Univ",
          startYear: 2015,
          endYear: 2019,
        },
        {
          level: "UNIVERSITY",
          school: "D Univ",
          startYear: 2019,
          endYear: 2021,
        },
      ],
      [
        { company: "Old Co", startYear: 2019, endYear: 2022 },
        { company: "New Co", startYear: 2022, endYear: null },
      ],
      now,
    );
    expect(p.schools).toEqual({
      JUNIOR_HIGH: "A JHS",
      HIGH_SCHOOL: "B High",
      UNIVERSITY: "C Univ",
    });
    expect(p.now).toEqual({ kind: "work", name: "New Co" });
  });

  it("falls back to a current school; empty history has no path", () => {
    const p = pathOf(
      [
        {
          level: "UNIVERSITY",
          school: "C Univ",
          startYear: 2024,
          endYear: null,
        },
      ],
      [],
      now,
    );
    expect(p.now).toEqual({ kind: "school", name: "C Univ" });
    expect(pathOf([], [], now)).toEqual({
      schools: {},
      now: null,
      hasHistory: false,
    });
  });

  it("ranks names by count", () => {
    expect(topNames(["X", "Y", "X", null, "Z", "Y", "X"], 2)).toEqual([
      { name: "X", count: 3 },
      { name: "Y", count: 2 },
    ]);
  });
});
