import { describe, expect, it } from "vitest";
import {
  LINK_STATE_TTL_MS,
  lineLinkStartUrl,
  returnUrl,
  safeReturnPath,
  signLinkState,
  verifyLinkState,
} from "./line-link";

const key = "k1";
const input = {
  userId: "user_1",
  returnTo: "/settings",
  locale: "en" as const,
};

describe("line link state", () => {
  it("round-trips a valid state", () => {
    const token = signLinkState(input, { key, now: 1000 });
    const state = verifyLinkState(token, { key, now: 2000 });
    expect(state).toMatchObject({
      u: "user_1",
      r: "/settings",
      l: "en",
      e: 1000 + LINK_STATE_TTL_MS,
    });
    expect(state?.n).toBeTypeOf("string");
  });

  it("produces a unique token each time (nonce)", () => {
    expect(signLinkState(input, { key, now: 0 })).not.toBe(
      signLinkState(input, { key, now: 0 }),
    );
  });

  it("rejects a tampered payload", () => {
    const token = signLinkState(input, { key, now: 0 });
    const [, sig] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({
        u: "attacker",
        r: "/",
        l: "en",
        e: Number.MAX_SAFE_INTEGER,
        n: "x",
      }),
    ).toString("base64url");
    expect(verifyLinkState(`${forged}.${sig}`, { key, now: 1 })).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const token = signLinkState(input, { key, now: 0 });
    // Flip the first signature char (the last one partly encodes padding bits).
    const [payload, sig] = token.split(".");
    const flipped = (sig[0] === "A" ? "B" : "A") + sig.slice(1);
    expect(
      verifyLinkState(`${payload}.${flipped}`, { key, now: 1 }),
    ).toBeNull();
  });

  it("rejects a token signed with another key", () => {
    const token = signLinkState(input, { key: "other", now: 0 });
    expect(verifyLinkState(token, { key, now: 1 })).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = signLinkState(input, { key, now: 0 });
    expect(
      verifyLinkState(token, { key, now: LINK_STATE_TTL_MS - 1 }),
    ).not.toBeNull();
    expect(verifyLinkState(token, { key, now: LINK_STATE_TTL_MS })).toBeNull();
  });

  it("rejects garbage", () => {
    for (const bad of [undefined, "", "abc", "a.b.c", "..", 42]) {
      expect(verifyLinkState(bad, { key })).toBeNull();
    }
  });

  it("uses AUTH_SECRET by default", () => {
    const token = signLinkState(input);
    expect(verifyLinkState(token)?.u).toBe("user_1");
    expect(verifyLinkState(token, { key })).toBeNull();
  });
});

describe("safeReturnPath", () => {
  it("keeps local paths", () => {
    expect(safeReturnPath("/settings")).toBe("/settings");
    expect(safeReturnPath("/events/1?x=1")).toBe("/events/1?x=1");
  });
  it("blocks open redirects", () => {
    for (const bad of [
      "https://evil.test",
      "//evil.test",
      "/\\evil.test",
      "evil",
      null,
    ]) {
      expect(safeReturnPath(bad)).toBe("/");
    }
  });
  it("sanitizes the return path when signing", () => {
    const token = signLinkState(
      { ...input, returnTo: "//evil.test" },
      { key, now: 0 },
    );
    expect(verifyLinkState(token, { key, now: 1 })?.r).toBe("/");
  });
});

describe("urls", () => {
  it("builds the start url", () => {
    expect(lineLinkStartUrl("u", "/dashboard", "ja")).toMatch(
      /\/api\/line\/link\/start\?s=[\w.%-]+$/,
    );
  });
  it("builds a locale-prefixed return url", () => {
    expect(returnUrl({ r: "/settings", l: "ja" }, { line: "linked" })).toMatch(
      /\/ja\/settings\?line=linked$/,
    );
    expect(returnUrl({ r: "/", l: "en" }, { line: "linked" })).toMatch(
      /\/en\?line=linked$/,
    );
  });
});
