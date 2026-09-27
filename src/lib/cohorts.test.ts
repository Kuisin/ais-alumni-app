import { describe, expect, it } from "vitest";
import {
  cohortChoices,
  cohortLabel,
  cohortNumberFor,
  elementaryEndFor,
  gradeLabel,
  latestCohortNumber,
  parseCohortNumber,
  suggestedStartYear,
} from "./cohorts";

const now = new Date("2026-09-27T00:00:00Z"); // school year 2026 (April–March)

describe("学年 numbering", () => {
  it("finishing 6th grade in 2016 is 第5期", () => {
    expect(cohortNumberFor(2016)).toBe(5);
    expect(cohortNumberFor(2012)).toBe(1);
    expect(elementaryEndFor(5)).toBe(2016);
    expect(suggestedStartYear(2016)).toBe(2010);
  });
  it("newest class is this year's 年少", () => {
    // 年少 in school year 2026 finishes 6th grade in March 2035 = 第24期
    expect(latestCohortNumber(now)).toBe(24);
  });
});

describe("labels", () => {
  it("shows graduation or the current grade", () => {
    expect(cohortLabel({ number: 5, elementaryEndYear: 2016 }, "ja", now)).toBe(
      "第5期（2016年 小学校卒業）",
    );
    expect(
      cohortLabel({ number: 21, elementaryEndYear: 2032 }, "ja", now),
    ).toBe("第21期（現在 小学1年生）");
    expect(
      cohortLabel({ number: 24, elementaryEndYear: 2035 }, "ja", now),
    ).toBe("第24期（現在 年少）");
    expect(
      cohortLabel({ number: 16, elementaryEndYear: 2027 }, "en", now),
    ).toBe("Class 16 (now Grade 6)");
  });
  it("grade names", () => {
    expect(gradeLabel(0, "ja")).toBe("年長");
    expect(gradeLabel(-2, "en")).toBe("Kindergarten (year 1)");
    expect(gradeLabel(4, "ja")).toBe("小学4年生");
  });
});

describe("choices (created on first use)", () => {
  it("offers 第1期 … 年少, newest first, graduation computed", () => {
    const choices = cohortChoices([], "ja", now);
    expect(choices).toHaveLength(24);
    expect(choices[0]).toMatchObject({ value: "24", graduated: false });
    expect(choices.find((c) => c.value === "15")).toMatchObject({
      graduated: true,
    }); // finished March 2026
    expect(choices.find((c) => c.value === "16")).toMatchObject({
      graduated: false,
    });
  });
  it("parses form values", () => {
    expect(parseCohortNumber("5")).toBe(5);
    expect(parseCohortNumber("")).toBeNull();
    expect(parseCohortNumber("0")).toBeUndefined();
  });
});
