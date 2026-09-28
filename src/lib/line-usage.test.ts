import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

const { jstMonthStart } = await import("./line-usage");

describe("jstMonthStart", () => {
  it("is 00:00 JST on the 1st (15:00 UTC the day before)", () => {
    expect(jstMonthStart(new Date("2026-09-28T00:41:00Z")).toISOString()).toBe(
      "2026-08-31T15:00:00.000Z",
    );
  });

  it("uses the Japan date near midnight", () => {
    // 16:00 UTC on Sep 30 is already Oct 1 in Japan.
    expect(jstMonthStart(new Date("2026-09-30T16:00:00Z")).toISOString()).toBe(
      "2026-09-30T15:00:00.000Z",
    );
    // 14:59 UTC on Sep 30 is still September in Japan.
    expect(jstMonthStart(new Date("2026-09-30T14:59:00Z")).toISOString()).toBe(
      "2026-08-31T15:00:00.000Z",
    );
  });

  it("rolls over the year", () => {
    expect(jstMonthStart(new Date("2026-12-31T15:30:00Z")).toISOString()).toBe(
      "2026-12-31T15:00:00.000Z",
    );
  });
});

describe("lineQuota", () => {
  const respond = (quota: unknown, usage: unknown) =>
    vi.fn(async (url: string) =>
      url.includes("/oauth2/v3/token")
        ? new Response(JSON.stringify({ access_token: "tok", expires_in: 900 }))
        : url.endsWith("/message/quota/consumption")
          ? new Response(JSON.stringify(usage))
          : url.endsWith("/message/quota")
            ? new Response(JSON.stringify(quota))
            : new Response("{}", { status: 404 }),
    );

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  async function load() {
    vi.stubEnv("LINE_MESSAGING_CHANNEL_ID", "123");
    vi.stubEnv("LINE_MESSAGING_CHANNEL_SECRET", "s3cret");
    return (await import("./line-usage")).lineQuota;
  }

  it("returns LINE's count and the month's limit", async () => {
    vi.stubGlobal(
      "fetch",
      respond({ type: "limited", value: 200 }, { totalUsage: 37 }),
    );
    expect(await (await load())()).toEqual({ used: 37, limit: 200 });
  });

  it("has no limit when none is set", async () => {
    vi.stubGlobal("fetch", respond({ type: "none" }, { totalUsage: 5 }));
    expect(await (await load())()).toEqual({ used: 5, limit: null });
  });

  it("is null when LINE fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("/oauth2/v3/token")
          ? new Response(JSON.stringify({ access_token: "t", expires_in: 900 }))
          : new Response("oops", { status: 500 }),
      ),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await (await load())()).toBeNull();
  });
});
