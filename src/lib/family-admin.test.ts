import { describe, expect, it } from "vitest";
import { familyGroups } from "./family-admin";

describe("familyGroups", () => {
  it("joins parents and children through confirmed links", () => {
    // mum–kid1, mum–kid2 (siblings via mum), dad alone after his link went.
    const groups = familyGroups(
      ["mum", "kid1", "kid2", "dad"],
      [
        { parentId: "mum", childId: "kid1" },
        { parentId: "mum", childId: "kid2" },
        { parentId: "dad", childId: null },
      ],
    );
    expect(groups[0].sort()).toEqual(["kid1", "kid2", "mum"]);
    expect(groups[1]).toEqual(["dad"]);
  });
  it("ignores links to people outside the family", () => {
    expect(
      familyGroups(["a", "b"], [{ parentId: "a", childId: "x" }]),
    ).toHaveLength(2);
  });
});
