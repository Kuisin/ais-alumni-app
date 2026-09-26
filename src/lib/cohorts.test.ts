import { describe, expect, it } from "vitest";
import {
  cohortLabel,
  cohortNumberFor,
  cohortOptions,
  defaultGraduated,
  elementaryEndFor,
  latestCohortNumber,
  schoolYearEnd,
  suggestedStartYear,
} from "./cohorts";

describe("学年 numbering", () => {
  it("finishing 6th grade in 2016 is 第5期", () => {
    expect(cohortNumberFor(2016)).toBe(5);
    expect(cohortNumberFor(2012)).toBe(1);
    expect(elementaryEndFor(5)).toBe(2016);
    expect(suggestedStartYear(2016)).toBe(2010);
  });
  it("school year starts in August (JST)", () => {
    expect(schoolYearEnd(new Date("2026-07-31T12:00:00Z"))).toBe(2026);
    expect(schoolYearEnd(new Date("2026-08-01T00:00:00Z"))).toBe(2027);
    // 2026–27 school year: 1st graders finish 6th grade in 2032 = 第21期
    expect(latestCohortNumber(new Date("2026-09-27T00:00:00Z"))).toBe(21);
  });
  it("defaults to graduated once high school is over", () => {
    const now = new Date("2026-09-27T00:00:00Z"); // school year 2026–27
    expect(defaultGraduated(2016, now)).toBe(true); // HS 2022
    expect(defaultGraduated(2020, now)).toBe(true); // HS June 2026
    expect(defaultGraduated(2021, now)).toBe(false); // HS 2027
  });
  it("labels and sorts classes", () => {
    const c = {
      id: "a",
      number: 5,
      elementaryStartYear: 2010,
      elementaryEndYear: 2016,
      graduated: true,
    };
    expect(cohortLabel(c, "ja")).toBe("第5期（小学校 2010–2016）");
    expect(cohortLabel(c, "en")).toBe("Class 5 (elementary 2010–2016)");
    expect(
      cohortOptions([{ ...c, id: "b", number: 7 }, c], "en").map((o) => o.id),
    ).toEqual(["a", "b"]);
  });
});
