import { describe, expect, it } from "vitest";
import { DirectChatRule, RoleKey } from "@/generated/prisma/enums";
import {
  canHaveDirect,
  DEFAULT_DIRECT_RULES,
  directAllowed,
  mergeDirectRules,
} from "./direct-policy";

const {
  TEACHER,
  CURRENT_STUDENT,
  CURRENT_PARENT,
  FORMER_STUDENT,
  FORMER_PARENT,
} = RoleKey;
const rules = DEFAULT_DIRECT_RULES;

describe("directAllowed (defaults)", () => {
  it("lets graduates and teachers talk", () => {
    expect(directAllowed([FORMER_STUDENT], [FORMER_STUDENT], rules)).toBe(true);
    expect(directAllowed([FORMER_STUDENT], [TEACHER], rules)).toBe(true);
  });

  it("gives current students no 1:1 talks", () => {
    expect(directAllowed([CURRENT_STUDENT], [CURRENT_STUDENT], rules)).toBe(
      false,
    );
    expect(directAllowed([TEACHER], [CURRENT_STUDENT], rules)).toBe(false);
  });

  it("gives current parents no 1:1 talks", () => {
    expect(directAllowed([CURRENT_PARENT], [CURRENT_PARENT], rules)).toBe(
      false,
    );
    expect(directAllowed([FORMER_STUDENT], [CURRENT_PARENT], rules)).toBe(
      false,
    );
  });

  it("lets former parents talk only with former parents", () => {
    expect(directAllowed([FORMER_PARENT], [FORMER_PARENT], rules)).toBe(true);
    expect(directAllowed([FORMER_PARENT], [TEACHER], rules)).toBe(false);
    expect(directAllowed([FORMER_STUDENT], [FORMER_PARENT], rules)).toBe(false);
  });

  it("uses the strictest rule of a member with several types", () => {
    // A graduate who is also a current parent: no 1:1 talks.
    expect(
      directAllowed([FORMER_STUDENT, CURRENT_PARENT], [FORMER_STUDENT], rules),
    ).toBe(false);
    // A graduate who is also a former parent: only with former parents.
    expect(
      directAllowed([FORMER_STUDENT, FORMER_PARENT], [FORMER_STUDENT], rules),
    ).toBe(false);
    expect(
      directAllowed([FORMER_STUDENT, FORMER_PARENT], [FORMER_PARENT], rules),
    ).toBe(true);
  });

  it("allows members without a type (usual rules only)", () => {
    expect(directAllowed([], [FORMER_STUDENT], rules)).toBe(true);
  });
});

describe("mergeDirectRules", () => {
  it("applies saved rows over the defaults", () => {
    const merged = mergeDirectRules([
      { role: CURRENT_PARENT, rule: DirectChatRule.SAME_ROLE },
    ]);
    expect(merged[CURRENT_PARENT]).toBe(DirectChatRule.SAME_ROLE);
    expect(merged[CURRENT_STUDENT]).toBe(DirectChatRule.NOBODY);
    expect(directAllowed([CURRENT_PARENT], [CURRENT_PARENT], merged)).toBe(
      true,
    );
  });
});

describe("canHaveDirect", () => {
  it("is false when any type allows nobody", () => {
    expect(canHaveDirect([FORMER_PARENT], rules)).toBe(true);
    expect(canHaveDirect([CURRENT_STUDENT], rules)).toBe(false);
    expect(canHaveDirect([TEACHER, CURRENT_PARENT], rules)).toBe(false);
  });
});
