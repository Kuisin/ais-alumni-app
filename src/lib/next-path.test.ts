import { describe, expect, it } from "vitest";
import { safeNextPath, stripLocale } from "./next-path";

describe("stripLocale", () => {
  it("drops the locale prefix only", () => {
    expect(stripLocale("/ja/app/news?x=1")).toBe("/app/news?x=1");
    expect(stripLocale("/en")).toBe("/");
    expect(stripLocale("/english/app")).toBe("/english/app");
  });
});

describe("safeNextPath", () => {
  it("keeps app pages, dropping the locale", () => {
    expect(safeNextPath("/ja/app/news/abc")).toBe("/app/news/abc");
    expect(safeNextPath("/app/events/1?tab=x#y")).toBe("/app/events/1?tab=x#y");
  });
  it("rejects other sites and non-app pages", () => {
    for (const v of [
      "https://evil.example/app/x",
      "//evil.example/app/x",
      "/\\evil.example",
      "/ja/privacy",
      "/app",
      "/ja/app/onboarding/verify",
      "/app/auth/error",
      "",
      null,
      42,
    ])
      expect(safeNextPath(v)).toBeNull();
  });
});
