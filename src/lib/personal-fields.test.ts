import { describe, expect, it } from "vitest";
import { followerFieldSet, isPersonalField } from "./personal-fields";

describe("personal fields", () => {
  it("keeps only known fields", () => {
    expect([...followerFieldSet(["phone", "bogus", "x"])]).toEqual([
      "phone",
      "x",
    ]);
    expect(followerFieldSet(null).size).toBe(0);
    expect(isPersonalField("email")).toBe(true);
    expect(isPersonalField("dateOfBirth")).toBe(false);
  });
});
