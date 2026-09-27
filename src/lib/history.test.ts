import { describe, expect, it } from "vitest";
import {
  educationSchema,
  isOngoing,
  sortHistory,
  stageFromHistory,
  visibleHistory,
  workSchema,
} from "./history";

const now = new Date("2026-09-27T00:00:00Z");

describe("history", () => {
  it("validates entries", () => {
    expect(
      educationSchema.safeParse({
        level: "UNIVERSITY",
        school: "Nagoya University",
        field: "",
        startYear: "2016",
        endYear: "2020",
        visibility: "MEMBERS",
      }).data,
    ).toEqual({
      level: "UNIVERSITY",
      school: "Nagoya University",
      field: null,
      startYear: 2016,
      endYear: 2020,
      visibility: "MEMBERS",
    });
    const bad = workSchema.safeParse({
      company: "",
      title: "",
      startYear: "2020",
      endYear: "2019",
      visibility: "FOLLOWERS",
    });
    expect(bad.success).toBe(false);
  });
  it("orders current first, then most recent", () => {
    const list = [
      { id: "a", startYear: 2010, endYear: 2013 },
      { id: "b", startYear: 2020, endYear: null },
      { id: "c", startYear: 2014, endYear: 2018 },
    ];
    expect(sortHistory(list, now).map((e) => e.id)).toEqual(["b", "c", "a"]);
    expect(isOngoing({ startYear: 2022, endYear: 2026 }, now)).toBe(true);
  });
  it("hides follower-only entries from others", () => {
    const list = [
      { visibility: "MEMBERS" as const },
      { visibility: "FOLLOWERS" as const },
    ];
    expect(visibleHistory(list, false)).toHaveLength(1);
    expect(visibleHistory(list, true)).toHaveLength(2);
  });
  it("derives the current stage (school before work)", () => {
    const uni = {
      level: "UNIVERSITY" as const,
      school: "Nagoya University",
      startYear: 2024,
      endYear: null,
    };
    const job = { company: "Toyota", startYear: 2025, endYear: null };
    expect(stageFromHistory([uni], [job], now)).toEqual({
      stage: "UNIVERSITY_COLLEGE",
      detail: "Nagoya University",
    });
    expect(stageFromHistory([{ ...uni, endYear: 2020 }], [job], now)).toEqual({
      stage: "WORKING",
      detail: "Toyota",
    });
    expect(stageFromHistory([], [], now)).toBeNull();
  });
});
