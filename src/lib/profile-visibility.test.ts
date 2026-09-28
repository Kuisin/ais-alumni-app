import { describe, expect, it } from "vitest";
import { HistoryVisibility } from "@/generated/prisma/enums";
import { PERSONAL_FIELDS, type PersonalField } from "./personal-fields";
import {
  hiddenPersonalFields,
  historyReach,
  isAudience,
  personalReach,
  photoReach,
  previewAccess,
  seenBy,
} from "./profile-visibility";

const shared = new Set<PersonalField>(["phone", "x"]);

describe("profile visibility", () => {
  it("nests the audiences: family ⊇ followers ⊇ members", () => {
    expect(seenBy("members", "members")).toBe(true);
    expect(seenBy("followers", "members")).toBe(false);
    expect(seenBy("followers", "followers")).toBe(true);
    expect(seenBy("followers", "family")).toBe(true);
    expect(seenBy("family", "followers")).toBe(false);
    expect(seenBy("family", "family")).toBe(true);
    expect(seenBy("self", "family")).toBe(false);
  });

  it("maps each setting to its reach", () => {
    expect(personalReach("phone", shared)).toBe("followers");
    expect(personalReach("email", shared)).toBe("family");
    expect(photoReach(true)).toBe("members");
    expect(photoReach(false)).toBe("followers");
    expect(historyReach(HistoryVisibility.MEMBERS)).toBe("members");
    expect(historyReach(HistoryVisibility.FOLLOWERS)).toBe("followers");
  });

  it("previews with the matching private access", () => {
    expect(previewAccess("members")).toBe("none");
    expect(previewAccess("followers")).toBe("followers");
    expect(previewAccess("family")).toBe("all");
    expect(isAudience("family")).toBe(true);
    expect(isAudience("admin")).toBe(false);
    expect(isAudience(undefined)).toBe(false);
  });

  it("lists the personal fields a viewer can't see", () => {
    expect(hiddenPersonalFields("all", shared)).toEqual([]);
    expect(hiddenPersonalFields("none", shared)).toEqual([...PERSONAL_FIELDS]);
    const hidden = hiddenPersonalFields("followers", shared);
    expect(hidden).not.toContain("phone");
    expect(hidden).not.toContain("x");
    expect(hidden).toContain("email");
    expect(hidden).toHaveLength(PERSONAL_FIELDS.length - 2);
  });
});
