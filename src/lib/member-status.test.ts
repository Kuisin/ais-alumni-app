import { describe, expect, it } from "vitest";
import {
  childIsCurrent,
  parentRole,
  studentRoleFields,
  teacherFields,
} from "./member-status";

const now = new Date("2026-09-27T00:00:00Z");

describe("member status (automatic)", () => {
  it("current student in 第18期 (6th grade ends March 2029) is in grade 4", () => {
    expect(studentRoleFields(2029, 2020, null, now)).toEqual({
      role: "CURRENT_STUDENT",
      yearsFrom: 2020,
      yearsTo: null,
      graduationOrLeaveYear: null,
      didGraduate: null,
      lastDivision: "ELEMENTARY",
      currentGrade: 4,
    });
  });
  it("graduate and early leaver become former students", () => {
    expect(studentRoleFields(2016, 2008, null, now)).toMatchObject({
      role: "FORMER_STUDENT",
      didGraduate: true,
      graduationOrLeaveYear: 2016,
      yearsTo: null,
    });
    expect(studentRoleFields(2016, 2008, 2013, now)).toMatchObject({
      role: "FORMER_STUDENT",
      didGraduate: false,
      graduationOrLeaveYear: 2013,
      yearsTo: 2013,
    });
  });
  it("teacher status follows the leave year", () => {
    expect(teacherFields(2010, null, now)).toEqual({
      yearsFrom: 2010,
      yearsTo: null,
      teacherStatus: "CURRENT",
    });
    expect(teacherFields(2010, 2020, now)).toMatchObject({
      teacherStatus: "FORMER",
    });
  });
  it("parents are current while a child is at AIS", () => {
    expect(parentRole([false, childIsCurrent(2030, null, now)])).toBe(
      "CURRENT_PARENT",
    );
    expect(parentRole([childIsCurrent(2016, null, now)])).toBe("FORMER_PARENT");
  });
});
