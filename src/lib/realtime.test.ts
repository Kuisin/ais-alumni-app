import { describe, expect, it } from "vitest";
import { channelTopic } from "./realtime";

describe("realtime channel names", () => {
  it("are stable, secret-derived and differ per kind and id", () => {
    const a = channelTopic("chat", "g1", "s");
    expect(a).toBe(channelTopic("chat", "g1", "s"));
    expect(a).toMatch(/^ais:chat:[\w-]{32}$/);
    expect(a).not.toContain("g1");
    expect(channelTopic("user", "g1", "s")).not.toBe(a.replace("chat", "user"));
    expect(channelTopic("chat", "g2", "s")).not.toBe(a);
    expect(channelTopic("chat", "g1", "other")).not.toBe(a);
  });
});
