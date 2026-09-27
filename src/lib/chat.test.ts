import { describe, expect, it } from "vitest";
import { ChatGroupKind, RoleKey } from "@/generated/prisma/enums";
import { desiredGroups } from "./chat";

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
