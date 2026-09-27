import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/notify", () => ({ notify: vi.fn(), NOTIFY_USER_SELECT: {} }));

import { FamilyLinkInitiator, RoleKey } from "@/generated/prisma/enums";
import {
  canClaim,
  canConfirm,
  confirmerFor,
  exactNameMatch,
  planFamilyMerge,
} from "./family";

describe("planFamilyMerge", () => {
  it("creates a family when neither has one", () => {
    expect(planFamilyMerge(null, null)).toEqual({ kind: "create" });
  });
  it("does nothing when already in the same family", () => {
    expect(planFamilyMerge("f", "f")).toEqual({ kind: "none", familyId: "f" });
  });
  it("joins the side that has a family", () => {
    expect(planFamilyMerge("p", null)).toEqual({
      kind: "join",
      familyId: "p",
      joiner: "child",
    });
    expect(planFamilyMerge(null, "c")).toEqual({
      kind: "join",
      familyId: "c",
      joiner: "parent",
    });
  });
  it("moves the child's family into the parent's", () => {
    expect(planFamilyMerge("p", "c")).toEqual({
      kind: "merge",
      into: "p",
      from: "c",
    });
  });
});

describe("confirmerFor / canConfirm", () => {
  const base = {
    parentId: "P",
    childId: "C" as string | null,
    confirmedAt: null as Date | null,
  };

  it("parent-initiated links are confirmed by the child", () => {
    const link = { ...base, initiatedBy: FamilyLinkInitiator.PARENT };
    expect(confirmerFor(link)).toBe("child");
    expect(canConfirm("C", link)).toBe(true);
    expect(canConfirm("P", link)).toBe(false);
  });

  it("child-initiated links are confirmed by the parent", () => {
    const link = { ...base, initiatedBy: FamilyLinkInitiator.CHILD };
    expect(confirmerFor(link)).toBe("parent");
    expect(canConfirm("P", link)).toBe(true);
    expect(canConfirm("C", link)).toBe(false);
  });

  it("a child without an account needs an admin", () => {
    const link = {
      ...base,
      childId: null,
      initiatedBy: FamilyLinkInitiator.PARENT,
    };
    expect(confirmerFor(link)).toBe("admin");
    expect(canConfirm("P", link)).toBe(false);
  });

  it("confirmed links cannot be confirmed again", () => {
    const link = {
      ...base,
      confirmedAt: new Date(),
      initiatedBy: FamilyLinkInitiator.CHILD,
    };
    expect(canConfirm("P", link)).toBe(false);
  });

  it("strangers cannot confirm", () => {
    expect(
      canConfirm("X", { ...base, initiatedBy: FamilyLinkInitiator.PARENT }),
    ).toBe(false);
  });
});

describe("canClaim", () => {
  it("only parents claim children and only students claim parents", () => {
    expect(canClaim([RoleKey.CURRENT_PARENT], "child")).toBe(true);
    expect(canClaim([RoleKey.FORMER_STUDENT], "child")).toBe(false);
    expect(canClaim([RoleKey.CURRENT_STUDENT], "parent")).toBe(true);
    expect(canClaim([RoleKey.TEACHER], "parent")).toBe(false);
  });
});

describe("exactNameMatch", () => {
  const u = {
    nameRomaji: "Hanako Yamada",
    nameKanji: "山田 花子",
    nameAtAis: null,
  };
  it("matches full names regardless of case, width, and spacing", () => {
    expect(exactNameMatch("hanako  YAMADA", u)).toBe(true);
    expect(exactNameMatch("山田花子", u)).toBe(true);
    expect(exactNameMatch("ｈａｎａｋｏ ｙａｍａｄａ", u)).toBe(true);
  });
  it("rejects partial names", () => {
    expect(exactNameMatch("Hanako", u)).toBe(false);
    expect(exactNameMatch("山田", u)).toBe(false);
    expect(exactNameMatch("  ", u)).toBe(false);
  });
});

describe("exactNameMatch with Last, First names", async () => {
  const { exactNameMatch } = await import("./family");
  it("ignores order and the comma", () => {
    const u = {
      nameRomaji: "Suzuki, Hanako",
      nameKanji: "鈴木 花子",
      nameAtAis: null,
    };
    expect(exactNameMatch("Hanako Suzuki", u)).toBe(true);
    expect(exactNameMatch("suzuki hanako", u)).toBe(true);
    expect(exactNameMatch("鈴木花子", u)).toBe(true);
    expect(exactNameMatch("Hanako Sato", u)).toBe(false);
  });
});

describe("exactNameMatch is strict", async () => {
  const { exactNameMatch } = await import("./family");
  it("doesn't ignore digits or extra words", () => {
    const u = {
      nameRomaji: "Link12345, Grad",
      nameKanji: null,
      nameAtAis: null,
    };
    expect(exactNameMatch("Grad Link12345", u)).toBe(true);
    expect(exactNameMatch("Grad Link99999", u)).toBe(false);
    expect(exactNameMatch("Grad", u)).toBe(false);
  });
});
