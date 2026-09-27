import { describe, expect, it } from "vitest";
import { ChatGroupKind, RoleKey } from "@/generated/prisma/enums";
import { desiredGroups, isAdult, latestApril1 } from "./chat";

describe("chat groups", () => {
  it("puts a graduate in 卒業生＋元在校生 and their class", () => {
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

describe("18歳以上 group", () => {
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

  it("is added only when asked for", () => {
    const roles = [{ role: RoleKey.CURRENT_PARENT, cohortId: null }];
    expect(desiredGroups(roles, []).map((g) => g.key)).toEqual([
      "CURRENT_PARENTS",
    ]);
    expect(desiredGroups(roles, [], { adult: true }).map((g) => g.key)).toEqual(
      ["CURRENT_PARENTS", "ADULTS"],
    );
  });
});
