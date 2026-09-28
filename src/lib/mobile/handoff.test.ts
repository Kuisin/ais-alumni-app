import { describe, expect, it } from "vitest";
import {
  APP_REDIRECT,
  allowedAppRedirect,
  challengeFor,
  createHandoffCode,
  redeemHandoffCode,
  sessionCookieName,
  validChallenge,
  webViewPath,
} from "./handoff";
import { bearerToken, hashMobileToken } from "./tokens";

const verifier = "v".repeat(43) + "-._~AZaz09";
const challenge = challengeFor(verifier);

describe("allowedAppRedirect", () => {
  it("accepts the app's scheme", () => {
    expect(allowedAppRedirect(APP_REDIRECT)).toBe("aisalumni://auth");
  });
  it("rejects web and other app URLs", () => {
    for (const v of [
      "https://evil.example/auth",
      "aisalumni://auth/extra",
      "aisalumni://evil",
      "otherapp://auth",
      "",
      null,
      42,
    ])
      expect(allowedAppRedirect(v)).toBeNull();
  });
  it("allows Expo Go only off production", () => {
    // vitest runs with NODE_ENV=test
    expect(allowedAppRedirect("exp://192.168.1.5:8081/--/auth")).toBe(
      "exp://192.168.1.5:8081/--/auth",
    );
    expect(allowedAppRedirect("exp://host/--/auth?x=1")).toBeNull();
    const env = process.env.NODE_ENV;
    try {
      // @ts-expect-error NODE_ENV is typed read-only
      process.env.NODE_ENV = "production";
      expect(allowedAppRedirect("exp://192.168.1.5:8081/--/auth")).toBeNull();
      expect(allowedAppRedirect(APP_REDIRECT)).toBe(APP_REDIRECT);
    } finally {
      // @ts-expect-error see above
      process.env.NODE_ENV = env;
    }
  });
});

describe("handoff codes", () => {
  it("round-trips with the matching verifier", () => {
    expect(validChallenge(challenge)).toBe(true);
    const code = createHandoffCode("user_1", challenge);
    expect(redeemHandoffCode(code, verifier)).toBe("user_1");
  });
  it("rejects another verifier", () => {
    const code = createHandoffCode("user_1", challenge);
    expect(redeemHandoffCode(code, "w".repeat(43))).toBeNull();
    expect(redeemHandoffCode(code, "short")).toBeNull();
  });
  it("expires after two minutes", () => {
    const now = Date.now();
    const code = createHandoffCode("user_1", challenge, now);
    expect(redeemHandoffCode(code, verifier, now + 119_000)).toBe("user_1");
    expect(redeemHandoffCode(code, verifier, now + 121_000)).toBeNull();
  });
  it("rejects tampered codes", () => {
    const code = createHandoffCode("user_1", challenge);
    const [body, mac] = code.split(".");
    const forged = Buffer.from(
      JSON.stringify({ u: "admin", c: challenge, e: Date.now() + 60_000 }),
    ).toString("base64url");
    expect(redeemHandoffCode(`${forged}.${mac}`, verifier)).toBeNull();
    expect(redeemHandoffCode(`${body}.x${mac}`, verifier)).toBeNull();
    expect(redeemHandoffCode(body, verifier)).toBeNull();
    expect(redeemHandoffCode(undefined, verifier)).toBeNull();
  });
});

describe("webViewPath", () => {
  it("keeps app pages, dropping the locale", () => {
    expect(webViewPath("/app/admin")).toBe("/app/admin");
    expect(webViewPath("/ja/app/family")).toBe("/app/family");
    expect(webViewPath("/en/app/onboarding/verify")).toBe(
      "/app/onboarding/verify",
    );
    expect(webViewPath("/app/news/new?x=1#y")).toBe("/app/news/new?x=1#y");
    expect(webViewPath("/support")).toBe("/support");
    expect(webViewPath("/ja/privacy")).toBe("/privacy");
  });
  it("rejects other origins, APIs and the sign-in screens", () => {
    for (const v of [
      "//evil.example/app",
      "https://evil.example/app/x",
      "/\\evil.example",
      "/api/files?key=x",
      "/n/abc/def",
      "/supportx",
      "/",
      "/app",
      "/ja/app",
      "/app?next=/app/x",
      "/app/auth/error",
      "app/admin",
      "",
      null,
    ])
      expect(webViewPath(v)).toBeNull();
  });
});

describe("tokens", () => {
  it("parses only our bearer tokens", () => {
    expect(bearerToken("Bearer aism_abc")).toBe("aism_abc");
    expect(bearerToken("bearer   aism_abc ")).toBe("aism_abc");
    expect(bearerToken("Bearer other")).toBeNull();
    expect(bearerToken("Basic aism_abc")).toBeNull();
    expect(bearerToken(`Bearer aism_${"x".repeat(200)}`)).toBeNull();
    expect(bearerToken(null)).toBeNull();
  });
  it("hashes deterministically", () => {
    expect(hashMobileToken("aism_a")).toBe(hashMobileToken("aism_a"));
    expect(hashMobileToken("aism_a")).not.toBe(hashMobileToken("aism_b"));
  });
  it("names the Auth.js cookie", () => {
    expect(sessionCookieName(true)).toBe("__Secure-authjs.session-token");
    expect(sessionCookieName(false)).toBe("authjs.session-token");
  });
});
