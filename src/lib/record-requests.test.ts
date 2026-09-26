import { describe, expect, it } from "vitest";
import {
  diffRecord,
  hasRecord,
  parseRecordForm,
  snapshot,
  toFormValues,
  toRoleUpdate,
} from "./record-requests";

describe("record correction requests", () => {
  const row = {
    cohort: 5,
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
      cohort: 5,
      yearsFrom: 2008,
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
      cohort: "6",
      graduationOrLeaveYear: "2015",
      didGraduate: "false",
    };
    const r = parseRecordForm("FORMER_STUDENT", form);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(diffRecord(current, r.values)).toEqual({
      cohort: 6,
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

  it("orders a former student's joined year before their leaving year", () => {
    expect(
      parseRecordForm("FORMER_STUDENT", {
        cohort: "",
        yearsFrom: "2014",
        lastDivision: "",
        graduationOrLeaveYear: "2010",
        didGraduate: "",
      }),
    ).toEqual({ ok: false, errors: { graduationOrLeaveYear: "yearsOrder" } });
  });

  it("maps an approved change to the role row", async () => {
    const data = await toRoleUpdate(
      "FORMER_STUDENT",
      { cohort: 6, graduationOrLeaveYear: 2015 },
      async (n) => `cohort-${n}`,
    );
    expect(data).toEqual({
      cohortId: "cohort-6",
      graduationOrLeaveYear: 2015,
      yearsTo: 2015,
    });
    expect(
      await toRoleUpdate("CURRENT_STUDENT", { cohort: null }, async () => "x"),
    ).toEqual({ cohortId: null });
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
        lastDivision: "",
        graduationOrLeaveYear: "20x",
        didGraduate: "",
      }),
    ).toEqual({
      ok: false,
      errors: { graduationOrLeaveYear: "invalidYear" },
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
        lastDivision: "COLLEGE",
        graduationOrLeaveYear: "",
        didGraduate: "",
      }).ok,
    ).toBe(false);
  });
});
