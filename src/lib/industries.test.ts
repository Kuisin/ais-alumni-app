import { describe, expect, it } from "vitest";
import {
  INDUSTRIES,
  industryGroupOf,
  industryLabel,
  isIndustryCode,
} from "./industries";

describe("業種 (マイナビ list)", () => {
  it("has unique codes in two levels", () => {
    const codes = INDUSTRIES.flatMap((g) => [
      g.code,
      ...g.children.map((c) => c.code),
    ]);
    expect(new Set(codes).size).toBe(codes.length);
    expect(INDUSTRIES.every((g) => g.children.length > 0)).toBe(true);
    expect(INDUSTRIES.map((g) => g.ja).slice(0, 3)).toEqual([
      "メーカー",
      "商社",
      "流通・小売",
    ]);
  });

  it("labels and groups a code", () => {
    expect(industryLabel("ICT-01", "ja")).toBe(
      "ソフトウエア・通信 › ソフトウエア",
    );
    expect(industryLabel("ICT", "en")).toBe("Software & telecommunications");
    expect(industryLabel("SVC-40", "ja")).toBe("サービス・インフラ › 教育");
    expect(industryLabel("nope", "ja")).toBeNull();
    expect(industryGroupOf("SVC-41")).toBe("SVC");
    expect(isIndustryCode("SVC-41")).toBe(true);
    expect(isIndustryCode("SVC-99")).toBe(false);
  });
});
