import { describe, expect, it } from "vitest";
import { AVATAR_MAX_BYTES, detectAvatarType } from "./image-type";
import { isHttpUrl, parseSocialLinks } from "./social-links";

describe("isHttpUrl", () => {
  it("accepts http(s) URLs only", () => {
    expect(isHttpUrl("https://instagram.com/me")).toBe(true);
    expect(isHttpUrl("http://example.com")).toBe(true);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("data:text/html,hi")).toBe(false);
    expect(isHttpUrl("instagram.com/me")).toBe(false);
    expect(isHttpUrl(`https://x.com/${"a".repeat(400)}`)).toBe(false);
  });
});

describe("parseSocialLinks", () => {
  it("keeps known keys with valid URLs", () => {
    expect(
      parseSocialLinks({
        instagram: "https://instagram.com/me",
        x: "javascript:alert(1)",
        myspace: "https://myspace.com/me",
        website: 42,
      }),
    ).toEqual({ instagram: "https://instagram.com/me" });
  });
  it("tolerates junk", () => {
    expect(parseSocialLinks(null)).toEqual({});
    expect(parseSocialLinks(["https://a.b"])).toEqual({});
    expect(parseSocialLinks("https://a.b")).toEqual({});
  });
});

describe("detectAvatarType", () => {
  it("recognises JPEG and PNG by magic bytes", () => {
    expect(
      detectAvatarType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.ext,
    ).toBe("jpg");
    expect(
      detectAvatarType(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]),
      )?.ext,
    ).toBe("png");
  });
  it("rejects other files", () => {
    expect(detectAvatarType(new TextEncoder().encode("GIF89a"))).toBeNull();
    expect(
      detectAvatarType(new TextEncoder().encode("<svg></svg>")),
    ).toBeNull();
    expect(detectAvatarType(new Uint8Array([]))).toBeNull();
  });
  it("limits size to 2 MB", () => {
    expect(AVATAR_MAX_BYTES).toBe(2 * 1024 * 1024);
  });
});
