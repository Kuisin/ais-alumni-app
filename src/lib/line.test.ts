import { afterEach, describe, expect, it, vi } from "vitest";

describe("LINE channel access token", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("issues a stateless token from ID + secret once and reuses it", async () => {
    vi.stubEnv("LINE_MESSAGING_CHANNEL_ID", "123");
    vi.stubEnv("LINE_MESSAGING_CHANNEL_SECRET", "s3cret");
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) =>
      url.includes("/oauth2/v3/token")
        ? new Response(JSON.stringify({ access_token: "tok", expires_in: 900 }))
        : new Response("{}"),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { linePush } = await import("./line");

    await linePush("U1", [{ type: "text", text: "a" }]);
    await linePush("U1", [{ type: "text", text: "b" }]);

    const tokenCalls = fetchMock.mock.calls.filter(([u]) =>
      u.includes("/oauth2/v3/token"),
    );
    expect(tokenCalls).toHaveLength(1);
    const pushCall = fetchMock.mock.calls.find(([u]) =>
      u.includes("/message/push"),
    );
    expect(pushCall?.[1]?.headers).toMatchObject({
      Authorization: "Bearer tok",
    });
  });

  it("logs instead of calling LINE when nothing is configured", async () => {
    vi.stubEnv("LINE_MESSAGING_CHANNEL_ID", "");
    vi.stubEnv("LINE_MESSAGING_CHANNEL_SECRET", "");
    vi.stubEnv("LINE_MESSAGING_CHANNEL_ACCESS_TOKEN", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "info").mockImplementation(() => {});
    const { linePush } = await import("./line");
    await linePush("U1", [{ type: "text", text: "a" }]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
