import { describe, expect, it } from "vitest";
import { ChatGroupKind, RoleKey } from "@/generated/prisma/enums";
import {
  applyMention,
  desiredGroups,
  directKey,
  isAdult,
  latestApril1,
  mentionQuery,
  mentionsIn,
  splitMentions,
} from "./chat";

describe("chat groups", () => {
  it("puts a former student in 元在校生 and their class", () => {
    expect(
      desiredGroups([{ role: RoleKey.FORMER_STUDENT, cohortId: "c5" }], []).map(
        (g) => g.key,
      ),
    ).toEqual(["FORMER_STUDENTS", "COHORT:c5"]);
  });

  it("puts parents in their type group and each child's class", () => {
    const g = desiredGroups(
      [{ role: RoleKey.CURRENT_PARENT, cohortId: null }],
      ["c20", "c22"],
    );
    expect(g.map((x) => x.key)).toEqual([
      "CURRENT_PARENTS",
      "COHORT_PARENTS:c20",
      "COHORT_PARENTS:c22",
    ]);
    expect(g[1]).toMatchObject({
      kind: ChatGroupKind.COHORT_PARENTS,
      cohortId: "c20",
    });
  });

  it("gives child classes only to parents, and teachers their group", () => {
    expect(
      desiredGroups([{ role: RoleKey.TEACHER, cohortId: null }], ["c1"]).map(
        (g) => g.key,
      ),
    ).toEqual(["TEACHERS"]);
  });
});

describe("元在校生 / 卒業生 and their 成人 groups", () => {
  const at = (iso: string) => new Date(`${iso}T00:00:00+09:00`);
  const dob = (iso: string) => new Date(`${iso}T00:00:00Z`);

  it("counts from the April 1 on or after the 18th birthday (JST)", () => {
    expect(latestApril1(at("2027-03-31"))).toBe("2026-04-01");
    expect(latestApril1(at("2027-04-01"))).toBe("2027-04-01");
    // Turns 18 on April 1: joins that day.
    expect(isAdult(dob("2008-04-01"), at("2026-03-31"))).toBe(false);
    expect(isAdult(dob("2008-04-01"), at("2026-04-01"))).toBe(true);
    // Turns 18 on April 2: waits for the next April 1.
    expect(isAdult(dob("2008-04-02"), at("2026-04-02"))).toBe(false);
    expect(isAdult(dob("2008-04-02"), at("2027-03-31"))).toBe(false);
    expect(isAdult(dob("2008-04-02"), at("2027-04-01"))).toBe(true);
    // Leap-day birthday; no birth date = not in the group.
    expect(isAdult(dob("2008-02-29"), at("2026-04-01"))).toBe(true);
    expect(isAdult(null, at("2030-04-01"))).toBe(false);
  });

  const keys = (
    roles: Parameters<typeof desiredGroups>[0],
    opts: Parameters<typeof desiredGroups>[2],
  ) => desiredGroups(roles, [], opts).map((g) => g.key);
  const graduated = [
    { role: RoleKey.FORMER_STUDENT, cohortId: null, didGraduate: true },
  ];
  const left = [
    { role: RoleKey.FORMER_STUDENT, cohortId: null, didGraduate: false },
  ];

  it("元在校生 includes graduates; 卒業生 only those who graduated", () => {
    const on = { graduates: true };
    expect(keys(graduated, on)).toEqual(["FORMER_STUDENTS", "GRADUATES"]);
    expect(keys(left, on)).toEqual(["FORMER_STUDENTS"]);
  });

  it("成人 versions from the April 1 after turning 18", () => {
    const adult = { graduates: true, adult: true };
    expect(keys(graduated, adult)).toEqual([
      "FORMER_STUDENTS",
      "ADULTS",
      "GRADUATES",
      "GRADUATES_ADULTS",
    ]);
    expect(keys(left, adult)).toEqual(["FORMER_STUDENTS", "ADULTS"]);
  });

  it("卒業生 groups wait for the flag (new enum values reach main first)", () => {
    expect(keys(graduated, { adult: true })).toEqual([
      "FORMER_STUDENTS",
      "ADULTS",
    ]);
  });

  it("isn't for current students, parents or teachers", () => {
    for (const role of [
      RoleKey.CURRENT_STUDENT,
      RoleKey.CURRENT_PARENT,
      RoleKey.TEACHER,
    ])
      expect(
        keys([{ role, cohortId: null }], { adult: true, graduates: true }),
      ).not.toEqual(expect.arrayContaining(["ADULTS"]));
  });
});

describe("同窓会委員 group", () => {
  it("is added for committee members (any type) when enabled", () => {
    const teacher = [{ role: RoleKey.TEACHER, cohortId: null }];
    expect(
      desiredGroups(teacher, [], { committee: true }).map((g) => g.key),
    ).toEqual(["TEACHERS", "ALUMNI_COMMITTEE"]);
    // Also for someone with no role at all (e.g. an admin).
    expect(
      desiredGroups([], [], { committee: true }).map((g) => g.key),
    ).toEqual(["ALUMNI_COMMITTEE"]);
    expect(desiredGroups(teacher, []).map((g) => g.key)).toEqual(["TEACHERS"]);
  });
});

describe("1:1 talks", () => {
  it("have one key per pair, whoever starts", () => {
    expect(directKey("b", "a")).toBe("DIRECT:a:b");
    expect(directKey("a", "b")).toBe(directKey("b", "a"));
  });
});

describe("mentions", () => {
  it("finds the @query being typed", () => {
    expect(mentionQuery("hi @Suz", 7)).toEqual({ start: 3, query: "Suz" });
    expect(mentionQuery("@", 1)).toEqual({ start: 0, query: "" });
    expect(mentionQuery("mail@example", 12)).toBeNull();
    expect(mentionQuery("hi @Suz\nnext", 12)).toBeNull();
  });

  it("inserts the name and works out who is mentioned", () => {
    const r = applyMention("hi @Suz and", 3, 7, "Suzuki, Hanako");
    expect(r).toEqual({ text: "hi @Suzuki, Hanako  and", caret: 19 });
    const members = [
      { id: "h", name: "Suzuki, Hanako" },
      { id: "t", name: "Tanaka, Ken" },
    ];
    expect(mentionsIn(r.text, members, ["全員", "all"])).toEqual({
      userIds: ["h"],
      all: false,
    });
    expect(mentionsIn("@全員 集合！", members, ["全員", "all"]).all).toBe(true);
  });

  it("splits a message for highlighting, longest name first", () => {
    expect(splitMentions("@Ann, B and @Ann hi", ["Ann", "Ann, B"])).toEqual([
      { text: "@Ann, B", mention: true },
      { text: " and ", mention: false },
      { text: "@Ann", mention: true },
      { text: " hi", mention: false },
    ]);
  });
});

describe("学年代表 group", () => {
  it("is added for representatives", () => {
    const roles = [{ role: RoleKey.FORMER_STUDENT, cohortId: "c5" }];
    expect(desiredGroups(roles, [], { rep: true }).map((g) => g.key)).toEqual([
      "FORMER_STUDENTS",
      "COHORT:c5",
      "CLASS_REPS",
    ]);
    expect(desiredGroups(roles, []).map((g) => g.key)).not.toContain(
      "CLASS_REPS",
    );
  });
});
