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
  hasKanjiName: false,
};

describe("setup checklist", () => {
  it("before approval: email, application, approval, LINE (+ family)", () => {
    const items = setupChecklist(base);
    expect(items.map((i) => i.key)).toEqual([
      "email",
      "apply",
      "approval",
      "line",
      "names",
      "family",
    ]);
    // Family is optional and waits for approval (no link yet).
    expect(items.at(-1)).toMatchObject({ optional: true, href: null });
    expect(setupProgress(items)).toEqual({
      done: 2,
      total: 4,
      complete: false,
    });
    expect(items.find((i) => i.key === "line")?.href).toBe(
      "/app/onboarding/status#line",
    );
  });
  it("after approval adds profile tasks; family is offered to everyone", () => {
    const items = setupChecklist({ ...base, active: true });
    expect(items.map((i) => i.key)).toEqual([
      "email",
      "apply",
      "approval",
      "line",
      "names",
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
    expect(items.map((i) => i.key)).toEqual([
      "email",
      "apply",
      "approval",
      "names",
      "family",
    ]);
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
    // The optional family link isn't needed to finish setup.
    expect(setupProgress(all).complete).toBe(true);
    expect(all.find((i) => i.key === "family")?.href).toBe("/app/family");
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

  it("recommends kanji / kana names: form, then later, then a name request", () => {
    const at = (x: Partial<typeof base>) =>
      setupChecklist({ ...base, ...x }).find((i) => i.key === "names");
    expect(at({ submitted: false })).toMatchObject({
      recommended: true,
      optional: true,
      href: "/app/onboarding/verify",
    });
    expect(at({ submitted: true })?.href).toBeNull();
    expect(at({ active: true })?.href).toBe("/app/profile/edit#name");
    expect(at({ hasKanjiName: true })?.done).toBe(true);
  });
});
