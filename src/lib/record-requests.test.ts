import { describe, expect, it } from "vitest";
import {
  diffRecord,
  hasRecord,
  parseRecordForm,
  snapshot,
  toFormValues,
} from "./record-requests";

describe("record correction requests", () => {
  const row = {
    yearsFrom: 2008,
    yearsTo: 2014,
    lastDivision: "HIGH_SCHOOL",
    graduationOrLeaveYear: 2014,
    didGraduate: true,
    subjects: null,
    currentGrade: null,
    studentIdNo: null,
  };

  it("snapshots only the role's fields", () => {
    expect(snapshot("FORMER_STUDENT", row)).toEqual({
      yearsFrom: 2008,
      yearsTo: 2014,
      lastDivision: "HIGH_SCHOOL",
      graduationOrLeaveYear: 2014,
      didGraduate: true,
    });
    expect(snapshot("TEACHER", row)).toEqual({
      yearsFrom: 2008,
      yearsTo: 2014,
      subjects: null,
    });
    expect(hasRecord("CURRENT_PARENT")).toBe(false);
  });

  it("parses form strings and diffs against the current record", () => {
    const current = snapshot("FORMER_STUDENT", row);
    const form = {
      ...toFormValues("FORMER_STUDENT", current),
      yearsTo: "2015",
      graduationOrLeaveYear: "2015",
      didGraduate: "false",
    };
    const r = parseRecordForm("FORMER_STUDENT", form);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(diffRecord(current, r.values)).toEqual({
      yearsTo: 2015,
      graduationOrLeaveYear: 2015,
      didGraduate: false,
    });
  });

  it("returns an empty diff when nothing changed", () => {
    const current = snapshot("FORMER_STUDENT", row);
    const r = parseRecordForm(
      "FORMER_STUDENT",
      toFormValues("FORMER_STUDENT", current),
    );
    expect(r.ok && diffRecord(current, r.values)).toEqual({});
  });

  it("treats blanks as null and validates years, order and grades", () => {
    const r = parseRecordForm("TEACHER", {
      yearsFrom: "2010",
      yearsTo: "",
      subjects: " ",
    });
    expect(r).toEqual({
      ok: true,
      values: { yearsFrom: 2010, yearsTo: null, subjects: null },
    });
    expect(
      parseRecordForm("FORMER_STUDENT", {
        yearsFrom: "2014",
        yearsTo: "2010",
        lastDivision: "",
        graduationOrLeaveYear: "20x",
        didGraduate: "",
      }),
    ).toEqual({
      ok: false,
      errors: { graduationOrLeaveYear: "invalidYear", yearsTo: "yearsOrder" },
    });
    expect(
      parseRecordForm("CURRENT_STUDENT", {
        currentGrade: "13",
        studentIdNo: "",
      }),
    ).toEqual({ ok: false, errors: { currentGrade: "invalidGrade" } });
    expect(
      parseRecordForm("FORMER_STUDENT", {
        yearsFrom: "",
        yearsTo: "",
        lastDivision: "COLLEGE",
        graduationOrLeaveYear: "",
        didGraduate: "",
      }).ok,
    ).toBe(false);
  });
});
