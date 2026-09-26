import { describe, expect, it } from "vitest";
import {
  diffRecord,
  hasRecord,
  parseRecordForm,
  snapshot,
  toFormValues,
  toRoleUpdate,
} from "./record-requests";

describe("record correction requests (inputs only; status is derived)", () => {
  const row = {
    cohort: 5,
    yearsFrom: 2008,
    yearsTo: null,
    subjects: null,
    studentIdNo: null,
  };

  it("snapshots only the role's correctable inputs", () => {
    expect(snapshot("FORMER_STUDENT", row)).toEqual({
      cohort: 5,
      yearsFrom: 2008,
      yearsTo: null,
      studentIdNo: null,
    });
    expect(snapshot("TEACHER", row)).toEqual({
      yearsFrom: 2008,
      yearsTo: null,
      subjects: null,
    });
    expect(hasRecord("CURRENT_PARENT")).toBe(false);
    expect(hasRecord("FORMER_PARENT")).toBe(false);
  });

  it("parses form strings and diffs against the current record", () => {
    const current = snapshot("FORMER_STUDENT", row);
    const r = parseRecordForm("FORMER_STUDENT", {
      ...toFormValues("FORMER_STUDENT", current),
      cohort: "6",
      yearsTo: "2013",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(diffRecord(current, r.values)).toEqual({ cohort: 6, yearsTo: 2013 });
  });

  it("returns an empty diff when nothing changed", () => {
    const current = snapshot("CURRENT_STUDENT", row);
    const r = parseRecordForm(
      "CURRENT_STUDENT",
      toFormValues("CURRENT_STUDENT", current),
    );
    expect(r.ok && diffRecord(current, r.values)).toEqual({});
  });

  it("validates years and their order", () => {
    expect(
      parseRecordForm("TEACHER", {
        yearsFrom: "2010",
        yearsTo: "",
        subjects: " ",
      }),
    ).toEqual({
      ok: true,
      values: { yearsFrom: 2010, yearsTo: null, subjects: null },
    });
    expect(
      parseRecordForm("FORMER_STUDENT", {
        cohort: "",
        yearsFrom: "2014",
        yearsTo: "2010",
        studentIdNo: "",
      }),
    ).toEqual({
      ok: false,
      errors: { yearsTo: "yearsOrder" },
    });
    expect(
      parseRecordForm("TEACHER", {
        yearsFrom: "20x",
        yearsTo: "",
        subjects: "",
      }),
    ).toEqual({
      ok: false,
      errors: { yearsFrom: "invalidYear" },
    });
  });

  it("maps an approved change to the role row", async () => {
    expect(
      await toRoleUpdate(
        { cohort: 6, yearsTo: 2013 },
        async (n) => `cohort-${n}`,
      ),
    ).toEqual({ cohortId: "cohort-6", yearsTo: 2013 });
    expect(await toRoleUpdate({ cohort: null }, async () => "x")).toEqual({
      cohortId: null,
    });
  });
});
