import { describe, expect, it } from "vitest";
import {
  answersToFormState,
  emptyFormState,
  issuesToErrors,
  stepOfPath,
  toPayload,
  verificationSchema,
} from "./schema";

function filled() {
  const s = emptyFormState("en");
  s.lastNameRomaji = "Yamada";
  s.firstNameRomaji = "Taro";
  s.dateOfBirth = "2000-04-02";
  s.roles = ["FORMER_STUDENT", "TEACHER"];
  s.formerStudent = {
    cohortNumber: "5",
    yearsFrom: "2006",
    lastDivision: "HIGH_SCHOOL",
    graduationOrLeaveYear: "2018",
    didGraduate: "yes",
    homeroomTeacher: "Mr. Smith",
    classmates: ["Hanako Suzuki", ""],
    currentStage: "WORKING",
  };
  s.teacher = {
    yearsFrom: "2020",
    yearsTo: "",
    present: true,
    subjects: "Math",
    schoolEmail: "",
  };
  return s;
}

describe("verification schema (§6)", () => {
  it("accepts a complete form and normalises values", () => {
    const r = verificationSchema({ requireKanji: false }).safeParse(
      toPayload(filled()),
    );
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.roles).toEqual(["FORMER_STUDENT", "TEACHER"]);
    expect(r.data.formerStudent).toMatchObject({
      yearsFrom: 2006,
      didGraduate: true,
      classmates: ["Hanako Suzuki"],
    });
    expect(r.data.teacher).toMatchObject({ yearsTo: null, schoolEmail: null });
    expect(r.data.currentParent).toBeUndefined();
    expect(r.data.nameKanji).toBeNull();
    expect(r.data.nameRomaji).toBe("Taro Yamada");
    expect(r.data.middleNameRomaji).toBeNull();
  });

  it("requires kanji for the Japanese UI and role sections for selected roles", () => {
    const s = filled();
    s.roles = ["FORMER_STUDENT", "CURRENT_PARENT"];
    s.currentParent.children = [{ name: "", grade: "", homeroomTeacher: "" }];
    const r = verificationSchema({ requireKanji: true }).safeParse(
      toPayload(s),
    );
    expect(r.success).toBe(false);
    if (r.success) return;
    const errors = issuesToErrors(r.error.issues);
    expect(errors.lastNameKanji).toBe("required");
    expect(errors.firstNameKanji).toBe("required");
    expect(errors["currentParent.children.0.name"]).toBe("required");
    expect(errors["currentParent.children.0.grade"]).toBe("required");
  });

  it("validates year ordering and teacher end year", () => {
    const s = filled();
    s.formerStudent.graduationOrLeaveYear = "2001";
    s.teacher.present = false;
    const r = verificationSchema({ requireKanji: false }).safeParse(
      toPayload(s),
    );
    expect(r.success).toBe(false);
    if (r.success) return;
    const errors = issuesToErrors(r.error.issues);
    expect(errors["formerStudent.graduationOrLeaveYear"]).toBe("yearsOrder");
    expect(errors["teacher.yearsTo"]).toBe("required");
  });

  it("round-trips stored answers into form state for NEEDS_INFO", () => {
    const r = verificationSchema({ requireKanji: false }).safeParse(
      toPayload(filled()),
    );
    if (!r.success) throw new Error("unexpected");
    const state = answersToFormState(JSON.parse(JSON.stringify(r.data)), "ja");
    expect(state.formerStudent.yearsFrom).toBe("2006");
    expect(state.formerStudent.didGraduate).toBe("yes");
    expect(state.formerStudent.cohortNumber).toBe("5");
    expect(state.teacher.present).toBe(true);
    expect(state.locale).toBe("en");
    expect(answersToFormState("garbage", "ja").roles).toEqual([]);
  });

  it("maps error paths to steps", () => {
    expect(stepOfPath("nameRomaji")).toBe("basics");
    expect(stepOfPath("formerStudent.yearsTo")).toBe("roles");
    expect(stepOfPath("evidence")).toBe("evidence");
  });
});
