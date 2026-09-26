import { describe, expect, it } from "vitest";
import { NotifyChannel } from "@/generated/prisma/enums";
import { channelsFor, chooseChannel, type RoutableUser } from "./route";

const u = (o: Partial<RoutableUser> = {}): RoutableUser => ({
  lineUserId: "U1",
  lineFollowing: true,
  notifyVia: NotifyChannel.AUTO,
  primaryEmail: "a@example.com",
  ...o,
});

describe("notification routing (§11)", () => {
  it("uses LINE when linked, following and not email-only", () => {
    expect(chooseChannel(u())).toBe("LINE");
  });
  it("falls back to email when unfollowed, unlinked or email-only", () => {
    expect(chooseChannel(u({ lineFollowing: false }))).toBe("EMAIL");
    expect(chooseChannel(u({ lineUserId: null }))).toBe("EMAIL");
    expect(chooseChannel(u({ notifyVia: NotifyChannel.EMAIL_ONLY }))).toBe(
      "EMAIL",
    );
  });
  it("returns null when unreachable", () => {
    expect(
      chooseChannel(u({ lineUserId: null, primaryEmail: null })),
    ).toBeNull();
  });
  it("always adds email for alwaysEmail kinds", () => {
    expect(channelsFor(u(), { alwaysEmail: true })).toEqual(["LINE", "EMAIL"]);
    expect(
      channelsFor(u({ lineFollowing: false }), { alwaysEmail: true }),
    ).toEqual(["EMAIL"]);
    expect(channelsFor(u())).toEqual(["LINE"]);
  });
});
