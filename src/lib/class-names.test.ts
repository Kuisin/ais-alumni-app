import { describe, expect, it } from "vitest";
import { classYears } from "./class-names";
import { elementaryEndFor } from "./cohorts";
import { gradeInSchoolYear } from "./school";

describe("class names by year", () => {
  it("第5期 (6th grade ends March 2016)", () => {
    const rows = classYears(5);
    expect(rows[0]).toMatchObject({ schoolYear: 2006, en: "Jellyfish" });
    expect(rows.find((r) => r.en === "Orca")?.schoolYear).toBe(2009);
    expect(rows.find((r) => r.en === "1st grade")?.schoolYear).toBe(2010);
    expect(rows.at(-1)).toMatchObject({ schoolYear: 2015, en: "6th grade" });
  });

  it("agrees with the grade rules", () => {
    for (const r of classYears(12))
      expect(gradeInSchoolYear(elementaryEndFor(12), r.schoolYear)).toBe(
        r.grade,
      );
  });
});
