import { describe, expect, it } from "vitest";
import { NotifyChannel } from "@/generated/prisma/enums";
import {
  type Channel,
  channelsFor,
  chooseChannel,
  deliverWithFallback,
  type RoutableUser,
} from "./route";

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
  it("LINE-enabled kinds follow the member's choice", () => {
    expect(channelsFor(u(), { line: true })).toEqual(["LINE"]);
    expect(
      channelsFor(u({ notifyVia: NotifyChannel.EMAIL_ONLY }), { line: true }),
    ).toEqual(["EMAIL"]);
  });
});

describe("deliverWithFallback", () => {
  const ok = async () => {};
  const fail = async () => {
    throw new Error("LINE API /message/push failed: 429 monthly limit");
  };

  it("sends on the routed channels", async () => {
    const sent: Channel[] = [];
    const out = await deliverWithFallback(
      ["LINE"],
      true,
      async (ch) => {
        sent.push(ch);
      },
      () => {},
    );
    expect(out).toEqual(["LINE"]);
    expect(sent).toEqual(["LINE"]);
  });

  it("emails instead when LINE fails (e.g. monthly limit)", async () => {
    const errors: Channel[] = [];
    const out = await deliverWithFallback(
      ["LINE"],
      true,
      (ch) => (ch === "LINE" ? fail() : ok()),
      (ch) => errors.push(ch),
    );
    expect(out).toEqual(["EMAIL"]);
    expect(errors).toEqual(["LINE"]);
  });

  it("doesn't email twice when email was already routed", async () => {
    const calls: Channel[] = [];
    const out = await deliverWithFallback(
      ["LINE", "EMAIL"],
      true,
      async (ch) => {
        calls.push(ch);
        if (ch === "LINE") await fail();
      },
      () => {},
    );
    expect(out).toEqual(["EMAIL"]);
    expect(calls).toEqual(["LINE", "EMAIL"]);
  });

  it("has nothing to fall back to without an email address", async () => {
    const out = await deliverWithFallback(["LINE"], false, fail, () => {});
    expect(out).toEqual([]);
  });
});

describe("every other kind goes by email", () => {
  it("even when LINE is linked and followed", () => {
    expect(channelsFor(u())).toEqual(["EMAIL"]);
  });

  it("is skipped, not sent by LINE, without an email address", () => {
    expect(channelsFor(u({ primaryEmail: null }))).toEqual([]);
  });
});
