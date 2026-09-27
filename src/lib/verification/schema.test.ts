import { describe, expect, it } from "vitest";
import {
  answersToFormState,
  emptyChild,
  emptyFormState,
  issuesToErrors,
  stepOfPath,
  toPayload,
  verificationSchema,
} from "./schema";

function filled() {
  const s = emptyFormState("en");
  s.types = ["STUDENT", "TEACHER"];
  s.lastNameRomaji = "Yamada";
  s.firstNameRomaji = "Taro";
  s.dateOfBirth = "2000-04-02";
  s.student = {
    cohortNumber: "5",
    joinedYear: "2008",
    leftYear: "",
    studentIdNo: "",
    homeroomTeacher: "Mr. Smith",
    classmates: ["Hanako Suzuki", ""],
  };
  s.teacher = {
    joinedYear: "2020",
    leftYear: "",
    subjects: "Math",
    schoolEmail: "",
  };
  return s;
}

describe("verification schema (sign-up wizard)", () => {
  it("accepts a complete form and keeps only chosen sections", () => {
    const s = filled();
    s.parent.children = [
      {
        ...emptyChild("new"),
        lastNameRomaji: "Yamada",
        firstNameRomaji: "Jiro",
        dateOfBirth: "2018-05-05",
        cohortNumber: "20",
        joinedYear: "2021",
      },
    ];
    const r = verificationSchema({ requireKanji: false }).safeParse(
      toPayload(s),
    );
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.types).toEqual(["STUDENT", "TEACHER"]);
    expect(r.data.student).toMatchObject({
      cohortNumber: 5,
      joinedYear: 2008,
      leftYear: null,
      classmates: ["Hanako Suzuki"],
    });
    expect(r.data.teacher).toMatchObject({
      joinedYear: 2020,
      leftYear: null,
      schoolEmail: null,
    });
    expect(r.data.parent).toBeUndefined();
    expect(r.data.nameRomaji).toBe("Taro Yamada");
  });

  it("requires a type, フリガナ with kanji, and a 学年 for students", () => {
    const s = filled();
    s.types = [];
    // Kanji is optional (international students), but needs its フリガナ.
    s.lastNameKanji = "山田";
    let r = verificationSchema({ requireKanji: true }).safeParse(toPayload(s));
    expect(r.success).toBe(false);
    if (r.success) return;
    let errors = issuesToErrors(r.error.issues);
    expect(errors.types).toBe("typesRequired");
    expect(errors.lastNameKanji).toBeUndefined();
    expect(errors.lastNameKana).toBe("kanaRequired");

    s.types = ["STUDENT", "PARENT"];
    s.student.cohortNumber = "";
    s.parent.children = [emptyChild("new"), emptyChild("existing")];
    r = verificationSchema({ requireKanji: false }).safeParse(toPayload(s));
    expect(r.success).toBe(false);
    if (r.success) return;
    errors = issuesToErrors(r.error.issues);
    expect(errors["student.cohortNumber"]).toBe("cohortRequired");
    expect(errors["parent.children.0.lastNameRomaji"]).toBe("required");
    expect(errors["parent.children.0.dateOfBirth"]).toBe("required");
    expect(errors["parent.children.0.cohortNumber"]).toBe("cohortRequired");
    expect(errors["parent.children.1.existingUserId"]).toBe("childNotSelected");
  });

  it("left year can't be before joining", () => {
    const s = filled();
    s.student.leftYear = "2001";
    s.teacher.leftYear = "2019";
    const r = verificationSchema({ requireKanji: false }).safeParse(
      toPayload(s),
    );
    expect(r.success).toBe(false);
    if (r.success) return;
    const errors = issuesToErrors(r.error.issues);
    expect(errors["student.leftYear"]).toBe("yearsOrder");
    expect(errors["teacher.leftYear"]).toBe("yearsOrder");
  });

  it("round-trips stored answers into form state (NEEDS_INFO)", () => {
    const r = verificationSchema({ requireKanji: false }).safeParse(
      toPayload(filled()),
    );
    if (!r.success) throw new Error("unexpected");
    const state = answersToFormState(
      JSON.parse(JSON.stringify({ version: 2, ...r.data })),
      "ja",
    );
    expect(state.types).toEqual(["STUDENT", "TEACHER"]);
    expect(state.student.cohortNumber).toBe("5");
    expect(state.student.classmates).toEqual(["Hanako Suzuki", ""]);
    expect(state.teacher.subjects).toBe("Math");
    // Older (version 1) answers aren't mapped.
    expect(
      answersToFormState({ version: 1, roles: ["TEACHER"] }, "ja").types,
    ).toEqual([]);
  });

  it("maps error paths to wizard steps", () => {
    expect(stepOfPath("types")).toBe("type");
    expect(stepOfPath("lastNameRomaji")).toBe("basics");
    expect(stepOfPath("parent.children.0.name")).toBe("details");
    expect(stepOfPath("evidence")).toBe("review");
  });
});

describe("parent children", () => {
  it("accepts a registered child picked by id", () => {
    const s = filled();
    s.types = ["PARENT"];
    s.parent.children = [
      { ...emptyChild("existing"), existingUserId: "u1", name: "鈴木花子" },
    ];
    const r = verificationSchema({ requireKanji: false }).safeParse(
      toPayload(s),
    );
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.parent?.children[0]).toEqual({
      mode: "existing",
      existingUserId: "u1",
      name: "鈴木花子",
    });
  });

  it("maps older name-only answers into the new-child form", () => {
    const state = answersToFormState(
      {
        version: 2,
        types: ["PARENT"],
        parent: { children: [{ name: "山田次郎", cohortNumber: 20 }] },
      },
      "ja",
    );
    expect(state.parent.children[0]).toMatchObject({
      mode: "new",
      lastNameKanji: "山田次郎",
      cohortNumber: "20",
    });
  });
});

describe("フリガナ", () => {
  it("accepts katakana, converts hiragana and rejects romaji", () => {
    const s = filled();
    s.lastNameKanji = "山田";
    s.firstNameKanji = "太郎";
    s.lastNameKana = "やまだ";
    s.firstNameKana = "ﾀﾛｳ";
    const ok = verificationSchema({ requireKanji: false }).safeParse(
      toPayload(s),
    );
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.nameKana).toBe("ヤマダ タロウ");
    s.firstNameKana = "Taro";
    const bad = verificationSchema({ requireKanji: false }).safeParse(
      toPayload(s),
    );
    expect(bad.success).toBe(false);
    if (!bad.success)
      expect(issuesToErrors(bad.error.issues).firstNameKana).toBe("kanaOnly");
  });
});
