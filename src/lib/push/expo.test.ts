import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isDevPushToken, isExpoPushToken, sendExpoMessages } from "./expo";

describe("push tokens", () => {
  it("accepts Expo tokens only", () => {
    expect(isExpoPushToken("ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]")).toBe(
      true,
    );
    expect(isExpoPushToken("ExpoPushToken[abc-123]")).toBe(true);
    expect(isExpoPushToken("ExponentPushToken[]")).toBe(false);
    expect(isExpoPushToken("apns:abcdef")).toBe(false);
    expect(isExpoPushToken(`ExponentPushToken[${"a".repeat(300)}]`)).toBe(
      false,
    );
    expect(isExpoPushToken(42)).toBe(false);
  });
  it("tells development tokens apart", () => {
    expect(isDevPushToken("ExponentPushToken[dev-abc]")).toBe(true);
    expect(isDevPushToken("ExponentPushToken[abc]")).toBe(false);
  });
});

describe("sendExpoMessages", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("sends in chunks of 100 and returns tickets in order", async () => {
    vi.stubEnv("EXPO_PUSH_OUTBOX", "");
    const calls: unknown[][] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body)) as unknown[];
        calls.push(body);
        return Response.json({
          data: body.map((_m, i) => ({
            status: "ok",
            id: `t${calls.length}-${i}`,
          })),
        });
      }),
    );
    const messages = Array.from({ length: 150 }, (_, i) => ({
      to: `ExponentPushToken[${i}]`,
      title: "t",
    }));
    const tickets = await sendExpoMessages(messages);
    expect(calls.map((c) => c.length)).toEqual([100, 50]);
    expect(tickets).toHaveLength(150);
    expect(tickets[0]).toEqual({ status: "ok", id: "t1-0" });
    expect(tickets[149]).toEqual({ status: "ok", id: "t2-49" });
  });

  it("retries server errors, then succeeds", async () => {
    vi.stubEnv("EXPO_PUSH_OUTBOX", "");
    let n = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        n++;
        return n === 1
          ? new Response("busy", { status: 503 })
          : Response.json({ data: [{ status: "ok", id: "x" }] });
      }),
    );
    await expect(
      sendExpoMessages([{ to: "ExponentPushToken[a]" }]),
    ).resolves.toEqual([{ status: "ok", id: "x" }]);
    expect(n).toBe(2);
  });

  it("throws on a rejected request (callers fall back)", async () => {
    vi.stubEnv("EXPO_PUSH_OUTBOX", "");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { errors: [{ code: "UNAUTHORIZED", message: "no" }] },
          { status: 401 },
        ),
      ),
    );
    await expect(
      sendExpoMessages([{ to: "ExponentPushToken[a]" }]),
    ).rejects.toThrow(/UNAUTHORIZED/);
  });

  it("writes to the outbox instead when EXPO_PUSH_OUTBOX=1", async () => {
    vi.stubEnv("EXPO_PUSH_OUTBOX", "1");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const file = path.join(
      process.cwd(),
      ".data/dev-push/ExponentPushToken_dev-vitest_.jsonl",
    );
    await rm(file, { force: true });
    try {
      const tickets = await sendExpoMessages([
        { to: "ExponentPushToken[dev-vitest]", title: "hi" },
      ]);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(tickets[0]).toMatchObject({ status: "ok" });
      expect(tickets[0].status === "ok" && tickets[0].id).toMatch(/^outbox-/);
      expect(JSON.parse(await readFile(file, "utf8"))).toMatchObject({
        to: "ExponentPushToken[dev-vitest]",
        title: "hi",
      });
    } finally {
      await rm(file, { force: true });
    }
  });
});
