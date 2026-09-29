import { describe, expect, it } from "vitest";
import { NotifyChannel } from "@/generated/prisma/enums";
import {
  afterPushFailed,
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

describe("app notifications (PUSH)", () => {
  it("go to the app instead of LINE or email", () => {
    expect(channelsFor(u({ push: true }), { line: true })).toEqual(["PUSH"]);
    expect(channelsFor(u({ push: true }))).toEqual(["PUSH"]);
    expect(
      channelsFor(u({ push: true, lineUserId: null, primaryEmail: null })),
    ).toEqual(["PUSH"]);
  });
  it("email too for alwaysEmail kinds, when there is an email", () => {
    expect(channelsFor(u({ push: true }), { alwaysEmail: true })).toEqual([
      "PUSH",
      "EMAIL",
    ]);
    expect(
      channelsFor(u({ push: true, primaryEmail: null }), { alwaysEmail: true }),
    ).toEqual(["PUSH"]);
  });
  it("app-only sends reach nobody without the app", () => {
    expect(channelsFor(u(), { pushOnly: true, line: true })).toEqual([]);
    expect(channelsFor(u({ push: true }), { pushOnly: true })).toEqual([
      "PUSH",
    ]);
  });
  it("members without the app are routed as before", () => {
    expect(channelsFor(u({ push: false }), { line: true })).toEqual(["LINE"]);
    expect(channelsFor(u({ push: false }))).toEqual(["EMAIL"]);
  });
  it("a push that reached no device falls back to LINE / email", () => {
    expect(afterPushFailed(u(), ["PUSH"], { line: true })).toEqual(["LINE"]);
    expect(afterPushFailed(u(), ["PUSH"], {})).toEqual(["EMAIL"]);
    // alwaysEmail: email was routed anyway — not twice
    expect(
      afterPushFailed(u(), ["PUSH", "EMAIL"], { alwaysEmail: true }),
    ).toEqual(["EMAIL"]);
    expect(
      afterPushFailed(u(), ["PUSH", "EMAIL"], {
        line: true,
        alwaysEmail: true,
      }),
    ).toEqual(["LINE", "EMAIL"]);
    expect(afterPushFailed(u(), ["PUSH"], { pushOnly: true })).toEqual([]);
  });
});
