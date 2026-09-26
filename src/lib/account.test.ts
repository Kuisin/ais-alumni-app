import { describe, expect, it, vi } from "vitest";

// account.ts imports the DB and storage; the rules under test are pure.
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/storage", () => ({ deletePrivate: vi.fn() }));

const {
  canRemoveSignInMethod,
  canRevokeAdmin,
  isStorageKey,
  jstYear,
  signInMethods,
} = await import("./account");

const verified = { primaryEmail: "a@example.com", emailVerifiedAt: new Date() };

describe("signInMethods", () => {
  it("includes email when the primary email is verified", () => {
    expect(signInMethods({ ...verified, providers: [] })).toEqual(["email"]);
  });
  it("omits email when unverified and lists known providers in order", () => {
    expect(
      signInMethods({
        primaryEmail: "a@example.com",
        emailVerifiedAt: null,
        providers: ["line", "google", "x"],
      }),
    ).toEqual(["google", "line"]);
  });
});

describe("canRemoveSignInMethod", () => {
  it("never removes the email code", () => {
    expect(canRemoveSignInMethod(["email", "google"], "email")).toBe(false);
  });
  it("allows removing a provider when email remains", () => {
    expect(canRemoveSignInMethod(["email", "google"], "google")).toBe(true);
    expect(canRemoveSignInMethod(["email", "line"], "line")).toBe(true);
  });
  it("allows removing one provider when another provider remains", () => {
    expect(canRemoveSignInMethod(["google", "line"], "line")).toBe(true);
  });
  it("refuses to remove the last method", () => {
    expect(canRemoveSignInMethod(["line"], "line")).toBe(false);
  });
  it("refuses to remove a method that is not linked", () => {
    expect(canRemoveSignInMethod(["email"], "google")).toBe(false);
  });
});

describe("canRevokeAdmin", () => {
  it("keeps at least one admin", () => {
    expect(canRevokeAdmin({ targetIsAdmin: true, adminCount: 1 })).toBe(false);
    expect(canRevokeAdmin({ targetIsAdmin: true, adminCount: 2 })).toBe(true);
    expect(canRevokeAdmin({ targetIsAdmin: false, adminCount: 3 })).toBe(false);
  });
});

describe("isStorageKey", () => {
  it("distinguishes stored keys from external URLs", () => {
    expect(isStorageKey("avatars/u1/abc.jpg")).toBe(true);
    expect(isStorageKey("https://lh3.googleusercontent.com/a")).toBe(false);
    expect(isStorageKey("/api/files?key=x")).toBe(false);
    expect(isStorageKey(null)).toBe(false);
    expect(isStorageKey("")).toBe(false);
  });
});

describe("jstYear", () => {
  it("uses the JST calendar year", () => {
    expect(jstYear(new Date("2026-12-31T15:30:00Z"))).toBe(2027);
    expect(jstYear(new Date("2026-12-31T14:59:00Z"))).toBe(2026);
  });
});
