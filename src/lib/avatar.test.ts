import { describe, expect, it } from "vitest";
import { type Connections, defaultAvatar, photoVisible } from "./avatar";

const conn = (o: Partial<Connections> = {}): Connections => ({
  viewerId: "v",
  admin: false,
  familyId: null,
  connected: new Set(),
  ...o,
});
const t = { id: "t", avatarUrl: "k", avatarPublic: false, familyId: null };

describe("profile photos", () => {
  it("are hidden from members without a connection", () => {
    expect(photoVisible(conn(), t)).toBe(false);
    // Two members without a family are not "the same family".
    expect(photoVisible(conn(), { ...t, familyId: null })).toBe(false);
  });
  it("are shown to self, admins, family and connections", () => {
    expect(photoVisible(conn({ viewerId: "t" }), t)).toBe(true);
    expect(photoVisible(conn({ admin: true }), t)).toBe(true);
    expect(photoVisible(conn({ familyId: "f" }), { ...t, familyId: "f" })).toBe(
      true,
    );
    expect(photoVisible(conn({ connected: new Set(["t"]) }), t)).toBe(true);
  });
  it("are shown to everyone when public", () => {
    expect(photoVisible(conn(), { ...t, avatarPublic: true })).toBe(true);
  });
  it("fall back to an icon by gender", () => {
    expect(defaultAvatar("MALE")).toContain("male");
    expect(defaultAvatar("FEMALE")).toContain("female");
    expect(defaultAvatar(null)).toBe("/avatars/default.svg");
  });
});
