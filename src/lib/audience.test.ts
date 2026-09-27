import { describe, expect, it } from "vitest";
import {
  audiencesOfMember,
  audienceWhere,
  effectiveAudiences,
  isAudienceTargeted,
  membersInAudiences,
  parseAudiences,
  rolesForAudiences,
} from "./audience";

describe("audiences (卒業生 / 元在校生)", () => {
  it("splits former students by graduation", () => {
    expect(
      audiencesOfMember([{ role: "FORMER_STUDENT", didGraduate: true }]),
    ).toEqual(["GRADUATE"]);
    expect(
      audiencesOfMember([{ role: "FORMER_STUDENT", didGraduate: false }]),
    ).toEqual(["LEFT_STUDENT"]);
    expect(
      audiencesOfMember([{ role: "FORMER_STUDENT", didGraduate: null }]),
    ).toEqual(["GRADUATE", "LEFT_STUDENT"]);
    expect(audiencesOfMember([{ role: "TEACHER" }])).toEqual(["TEACHER"]);
  });

  it("falls back to legacy targetRoles when no audiences are stored", () => {
    expect(
      effectiveAudiences({
        targetAudiences: [],
        targetRoles: ["FORMER_STUDENT", "TEACHER"],
      }),
    ).toEqual(["GRADUATE", "LEFT_STUDENT", "TEACHER"]);
    expect(
      effectiveAudiences({
        targetAudiences: ["GRADUATE"],
        targetRoles: ["FORMER_STUDENT"],
      }),
    ).toEqual(["GRADUATE"]);
  });

  it("targets only the chosen half", () => {
    const graduatesOnly = {
      targetAudiences: ["GRADUATE" as const],
      targetRoles: ["FORMER_STUDENT" as const],
    };
    expect(
      isAudienceTargeted(graduatesOnly, {
        isAdmin: false,
        audiences: ["GRADUATE"],
      }),
    ).toBe(true);
    expect(
      isAudienceTargeted(graduatesOnly, {
        isAdmin: false,
        audiences: ["LEFT_STUDENT"],
      }),
    ).toBe(false);
    expect(
      isAudienceTargeted(graduatesOnly, { isAdmin: true, audiences: [] }),
    ).toBe(true);
    expect(
      isAudienceTargeted(
        { targetAudiences: [], targetRoles: [] },
        { isAdmin: false, audiences: [] },
      ),
    ).toBe(true);
  });

  it("keeps the legacy column meaningful and parses form input", () => {
    expect(rolesForAudiences(["GRADUATE", "LEFT_STUDENT", "TEACHER"])).toEqual([
      "FORMER_STUDENT",
      "TEACHER",
    ]);
    expect(parseAudiences(["GRADUATE", "nope", "GRADUATE"])).toEqual([
      "GRADUATE",
    ]);
  });

  it("builds DB filters", () => {
    expect(audienceWhere({ isAdmin: true, audiences: [] })).toEqual({});
    expect(membersInAudiences([])).toEqual({});
    expect(membersInAudiences(["LEFT_STUDENT"])).toEqual({
      roles: {
        some: {
          OR: [
            {
              role: "FORMER_STUDENT",
              OR: [{ didGraduate: false }, { didGraduate: null }],
            },
          ],
        },
      },
    });
  });
});

describe("member filters and labels", async () => {
  const { parseMemberFilter, roleLabelKey, roleRowWhere } = await import(
    "./audience"
  );
  it("labels former students by graduation", () => {
    expect(roleLabelKey({ role: "FORMER_STUDENT", didGraduate: true })).toBe(
      "audience.GRADUATE",
    );
    expect(roleLabelKey({ role: "FORMER_STUDENT", didGraduate: false })).toBe(
      "audience.LEFT_STUDENT",
    );
    expect(roleLabelKey({ role: "FORMER_STUDENT", didGraduate: null })).toBe(
      "role.FORMER_STUDENT",
    );
    expect(roleLabelKey({ role: "TEACHER" })).toBe("role.TEACHER");
  });
  it("filters strictly and keeps old links working", () => {
    expect(parseMemberFilter("LEFT_STUDENT")).toBe("LEFT_STUDENT");
    expect(parseMemberFilter("FORMER_STUDENT")).toBe("FORMER_STUDENT");
    expect(parseMemberFilter("x")).toBeNull();
    expect(roleRowWhere("GRADUATE")).toEqual({
      role: "FORMER_STUDENT",
      didGraduate: true,
    });
    expect(roleRowWhere("FORMER_STUDENT")).toEqual({ role: "FORMER_STUDENT" });
  });
});
