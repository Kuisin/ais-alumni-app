import { describe, expect, it } from "vitest";
import {
  INDUSTRIES,
  industryGroupOf,
  industryLabel,
  isIndustryCode,
} from "./industries";

describe("業種", () => {
  it("has unique codes in two levels", () => {
    const codes = INDUSTRIES.flatMap((g) => [
      g.code,
      ...g.children.map((c) => c.code),
    ]);
    expect(new Set(codes).size).toBe(codes.length);
    expect(INDUSTRIES.every((g) => g.children.length > 0)).toBe(true);
  });

  it("labels and groups a code", () => {
    expect(industryLabel("G-software", "ja")).toBe(
      "IT・通信 › ソフトウェア・SaaS",
    );
    expect(industryLabel("G", "en")).toBe("IT & telecommunications");
    expect(industryLabel("nope", "ja")).toBeNull();
    expect(industryGroupOf("O-international")).toBe("O");
    expect(isIndustryCode("O-international")).toBe(true);
    expect(isIndustryCode("O-x")).toBe(false);
  });
});
