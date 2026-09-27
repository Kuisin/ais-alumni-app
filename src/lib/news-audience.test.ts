import { describe, expect, it } from "vitest";
import {
  type AudienceViewer,
  audienceSpecSchema,
  EVERYONE,
  groupsOfMember,
  legacyColumns,
  matchesAudience,
  specFromPost,
} from "./news-audience";

const viewer = (v: Partial<AudienceViewer>): AudienceViewer => ({
  id: "u1",
  isAdmin: false,
  roles: [],
  childCohortIds: [],
  ...v,
});

describe("ニュース audience", () => {
  it("everyone when nothing is selected; admins always see", () => {
    expect(matchesAudience(EVERYONE, viewer({}))).toBe(true);
    const onlyTeachers = { ...EVERYONE, groups: ["TEACHER_CURRENT" as const] };
    expect(matchesAudience(onlyTeachers, viewer({ isAdmin: true }))).toBe(true);
    expect(matchesAudience(onlyTeachers, viewer({}))).toBe(false);
  });

  it("splits teachers and former students", () => {
    expect(
      groupsOfMember(
        viewer({ roles: [{ role: "TEACHER", teacherStatus: "FORMER" }] }),
      ),
    ).toEqual(["TEACHER_FORMER"]);
    expect(
      groupsOfMember(
        viewer({ roles: [{ role: "FORMER_STUDENT", didGraduate: false }] }),
      ),
    ).toEqual(["FORMER_STUDENT", "LEFT_STUDENT"]);
  });

  it("matches 学年, parents of 学年 and individual members (any condition)", () => {
    const spec = audienceSpecSchema.parse({
      cohortIds: ["c5"],
      includeParents: true,
      userIds: ["u9"],
    });
    expect(
      matchesAudience(
        spec,
        viewer({ roles: [{ role: "FORMER_STUDENT", cohortId: "c5" }] }),
      ),
    ).toBe(true);
    expect(
      matchesAudience(
        spec,
        viewer({ roles: [{ role: "FORMER_STUDENT", cohortId: "c6" }] }),
      ),
    ).toBe(false);
    expect(
      matchesAudience(
        spec,
        viewer({ roles: [{ role: "CURRENT_PARENT" }], childCohortIds: ["c5"] }),
      ),
    ).toBe(true);
    expect(matchesAudience(spec, viewer({ id: "u9" }))).toBe(true);
    const noParents = { ...spec, includeParents: false };
    expect(
      matchesAudience(
        noParents,
        viewer({ roles: [{ role: "CURRENT_PARENT" }], childCohortIds: ["c5"] }),
      ),
    ).toBe(false);
  });

  it("reads older posts and keeps older columns meaningful", () => {
    expect(
      specFromPost({
        audience: null,
        targetAudiences: [],
        targetRoles: ["TEACHER"],
      }).groups,
    ).toEqual(["TEACHER_CURRENT", "TEACHER_FORMER"]);
    expect(
      legacyColumns({ ...EVERYONE, groups: ["TEACHER_FORMER", "GRADUATE"] }),
    ).toEqual({
      targetAudiences: ["TEACHER", "GRADUATE"],
      targetRoles: ["TEACHER", "FORMER_STUDENT"],
    });
    expect(legacyColumns(EVERYONE)).toEqual({
      targetAudiences: [],
      targetRoles: [],
    });
  });
});

describe("卒業生 / 卒業生＋元在校生", () => {
  const left = viewer({
    roles: [{ role: "FORMER_STUDENT", didGraduate: false }],
  });
  const grad = viewer({
    roles: [{ role: "FORMER_STUDENT", didGraduate: true }],
  });
  it("卒業生 is graduates only; 卒業生＋元在校生 is everyone who left", () => {
    const g = { ...EVERYONE, groups: ["GRADUATE" as const] };
    expect(matchesAudience(g, grad)).toBe(true);
    expect(matchesAudience(g, left)).toBe(false);
    const all = { ...EVERYONE, groups: ["FORMER_STUDENT" as const] };
    expect(matchesAudience(all, grad)).toBe(true);
    expect(matchesAudience(all, left)).toBe(true);
  });
  it("older posts aimed at both halves read as 卒業生＋元在校生", () => {
    expect(
      specFromPost({
        audience: null,
        targetAudiences: ["GRADUATE", "LEFT_STUDENT"],
        targetRoles: [],
      }).groups,
    ).toEqual(["FORMER_STUDENT"]);
  });
});
