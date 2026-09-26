import { describe, expect, it } from "vitest";
import { cleanOrgName, orgNameKey } from "./organizations";

describe("organization names", () => {
  it("tidies display names", () => {
    expect(cleanOrgName("  名古屋　大学 ")).toBe("名古屋 大学");
    expect(cleanOrgName("Ｔｏｙｏｔａ")).toBe("Toyota");
  });
  it("treats near-identical names as the same", () => {
    expect(orgNameKey("名古屋大学")).toBe(orgNameKey("名古屋 大学"));
    expect(orgNameKey("Toyota Motor Corp.")).toBe(
      orgNameKey("toyota motor corp"),
    );
    expect(orgNameKey("Keio University")).not.toBe(
      orgNameKey("Waseda University"),
    );
  });
});
