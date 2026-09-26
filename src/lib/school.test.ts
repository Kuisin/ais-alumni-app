import { describe, expect, it } from "vitest";
import {
  classGradeNow,
  elementaryEndForGrade,
  isClassGraduated,
  isCurrentTeacher,
  schoolYearStart,
  studentStatus,
} from "./school";

const sept2026 = new Date("2026-09-27T00:00:00Z"); // school year 2026 (Apr 2026–Mar 2027)

describe("school year (April–March, JST)", () => {
  it("starts in April", () => {
    expect(schoolYearStart(new Date("2026-03-31T14:00:00Z"))).toBe(2025); // Mar 31 23:00 JST
    expect(schoolYearStart(new Date("2026-03-31T15:00:00Z"))).toBe(2026); // Apr 1 00:00 JST
    expect(schoolYearStart(sept2026)).toBe(2026);
  });
});

describe("classes (学年)", () => {
  it("grades: 6th grade in the year the class finishes, kindergarten ≤ 0", () => {
    expect(classGradeNow(2027, sept2026)).toBe(6); // finishes March 2027
    expect(classGradeNow(2033, sept2026)).toBe(0); // 年長
    expect(classGradeNow(2035, sept2026)).toBe(-2); // 年少
    expect(classGradeNow(2036, sept2026)).toBeNull(); // not at AIS yet
    expect(classGradeNow(2026, sept2026)).toBeNull(); // graduated March 2026
    expect(elementaryEndForGrade(1, sept2026)).toBe(2032);
  });
  it("graduates after the March its 6th grade ends", () => {
    expect(isClassGraduated(2026, sept2026)).toBe(true);
    expect(isClassGraduated(2027, sept2026)).toBe(false);
    expect(isClassGraduated(2027, new Date("2027-04-01T00:00:00Z"))).toBe(true);
  });
});

describe("student status (automatic)", () => {
  it("current student: grade from the class", () => {
    expect(studentStatus(2029, null, sept2026)).toEqual({
      current: true,
      didGraduate: false,
      graduationOrLeaveYear: null,
      lastDivision: "ELEMENTARY",
      currentGrade: 4,
    });
    expect(studentStatus(2034, null, sept2026)).toMatchObject({
      current: true,
      currentGrade: -1,
      lastDivision: "KINDERGARTEN",
    });
  });
  it("graduate: class finished and they didn't leave early", () => {
    expect(studentStatus(2016, null, sept2026)).toEqual({
      current: false,
      didGraduate: true,
      graduationOrLeaveYear: 2016,
      lastDivision: "ELEMENTARY",
      currentGrade: null,
    });
    // Leaving in the graduation year counts as graduating.
    expect(studentStatus(2016, 2016, sept2026)).toMatchObject({
      didGraduate: true,
    });
  });
  it("left early: from kindergarten or elementary", () => {
    expect(studentStatus(2016, 2013, sept2026)).toMatchObject({
      current: false,
      didGraduate: false,
      graduationOrLeaveYear: 2013,
      lastDivision: "ELEMENTARY", // grade 3 in school year 2012
    });
    expect(studentStatus(2016, 2010, sept2026)).toMatchObject({
      lastDivision: "KINDERGARTEN",
    });
  });
  it("a future leave year keeps them current", () => {
    expect(studentStatus(2030, 2028, sept2026)).toMatchObject({
      current: true,
    });
  });
});

describe("teacher status (automatic)", () => {
  it("current until the leave year arrives", () => {
    expect(isCurrentTeacher(null, sept2026)).toBe(true);
    expect(isCurrentTeacher(2027, sept2026)).toBe(true);
    expect(isCurrentTeacher(2026, sept2026)).toBe(false);
    expect(isCurrentTeacher(2015, sept2026)).toBe(false);
  });
});
