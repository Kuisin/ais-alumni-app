import { describe, expect, it } from "vitest";
import { isJobTypeCode, JOB_TYPES, jobTypeLabel } from "./job-types";

describe("職種", () => {
  it("has unique codes and labels", () => {
    const codes = JOB_TYPES.flatMap((g) => [
      g.code,
      ...g.children.map((c) => c.code),
    ]);
    expect(new Set(codes).size).toBe(codes.length);
    expect(jobTypeLabel("IT-01", "ja")).toBe("IT・Web系 › システムエンジニア");
    expect(jobTypeLabel("EDU", "en")).toBe("Education & public service");
    expect(isJobTypeCode("IT-99")).toBe(false);
  });
});
