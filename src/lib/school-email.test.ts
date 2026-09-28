import { describe, expect, it } from "vitest";
import { isSchoolEmail } from "./school-email";

describe("isSchoolEmail", () => {
  it("accepts only @aisnagoya.net", () => {
    expect(isSchoolEmail("t.sato@aisnagoya.net")).toBe(true);
    expect(isSchoolEmail(" T.Sato@AISNAGOYA.NET ")).toBe(true);
    expect(isSchoolEmail("t.sato@gmail.com")).toBe(false);
    expect(isSchoolEmail("x@mail.aisnagoya.net")).toBe(false);
    expect(isSchoolEmail("x@aisnagoya.net.evil.com")).toBe(false);
    expect(isSchoolEmail("@aisnagoya.net")).toBe(false);
    expect(isSchoolEmail(null)).toBe(false);
  });
});
