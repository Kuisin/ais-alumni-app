import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { realtimeToken } from "./realtime";

describe("realtime token", () => {
  it("is an HS256 JWT for the member, valid for an hour", () => {
    const t = realtimeToken("user1", "secret", 1000);
    const [head, body, sig] = t.split(".");
    expect(JSON.parse(Buffer.from(body, "base64url").toString())).toEqual({
      sub: "user1",
      role: "authenticated",
      aud: "authenticated",
      iat: 1000,
      exp: 4600,
    });
    expect(sig).toBe(
      createHmac("sha256", "secret")
        .update(`${head}.${body}`)
        .digest("base64url"),
    );
  });
});
