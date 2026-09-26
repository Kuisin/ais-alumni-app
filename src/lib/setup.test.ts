import { describe, expect, it } from "vitest";
import { type SetupInput, setupChecklist, setupProgress } from "./setup";

const base: SetupInput = {
  active: false,
  submitted: true,
  lineAvailable: true,
  lineLinked: false,
  lineFollowing: false,
  hasAvatar: false,
  hasBio: false,
  hasHistory: false,
  followsSomeone: false,
  isParent: false,
  hasFamilyLink: false,
};

describe("setup checklist", () => {
  it("before approval: email, application, approval, LINE", () => {
    const items = setupChecklist(base);
    expect(items.map((i) => i.key)).toEqual([
      "email",
      "apply",
      "approval",
      "line",
    ]);
    expect(setupProgress(items)).toEqual({
      done: 2,
      total: 4,
      complete: false,
    });
    expect(items.find((i) => i.key === "line")?.href).toBe(
      "/app/onboarding/status#line",
    );
  });
  it("after approval adds profile tasks; parents also get family", () => {
    const items = setupChecklist({ ...base, active: true, isParent: true });
    expect(items.map((i) => i.key)).toEqual([
      "email",
      "apply",
      "approval",
      "line",
      "photo",
      "bio",
      "history",
      "follow",
      "family",
    ]);
  });
  it("LINE counts only when linked and following", () => {
    expect(
      setupChecklist({ ...base, lineLinked: true }).find(
        (i) => i.key === "line",
      )?.done,
    ).toBe(false);
    expect(
      setupChecklist({ ...base, lineLinked: true, lineFollowing: true }).find(
        (i) => i.key === "line",
      )?.done,
    ).toBe(true);
  });
  it("leaves LINE out while LINE Login isn't configured", () => {
    const items = setupChecklist({ ...base, lineAvailable: false });
    expect(items.map((i) => i.key)).toEqual(["email", "apply", "approval"]);
  });
  it("complete when everything is done", () => {
    const all = setupChecklist({
      ...base,
      active: true,
      lineLinked: true,
      lineFollowing: true,
      hasAvatar: true,
      hasBio: true,
      hasHistory: true,
      followsSomeone: true,
    });
    expect(setupProgress(all).complete).toBe(true);
  });
});

describe("sso readiness", async () => {
  const { ssoReady } = await import("./sso");
  it("needs both id and secret", () => {
    const saved = { ...process.env };
    process.env.AUTH_GOOGLE_ID = "id";
    process.env.AUTH_GOOGLE_SECRET = "";
    expect(ssoReady("google")).toBe(false);
    process.env.AUTH_GOOGLE_SECRET = "secret";
    expect(ssoReady("google")).toBe(true);
    process.env = saved;
  });
});
