import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { type APIRequestContext, expect, test } from "@playwright/test";
import { Client } from "pg";
import {
  asListed,
  clearMailbox,
  createActiveGraduate,
  readCode,
} from "./helpers";

// App notifications (src/lib/push, src/lib/mobile/notifications.ts): the
// test server writes pushes to .data/dev-push/<token>.jsonl
// (EXPO_PUSH_OUTBOX=1) and accepts development tokens.
const API = "/api/mobile/v1";
const OUTBOX = path.join(process.cwd(), ".data", "dev-push");

type Pushed = {
  to: string;
  title?: string;
  body?: string;
  badge?: number;
  categoryId?: string;
  threadId?: string;
  data: {
    v: 1;
    kind: string;
    category: string;
    path: string | null;
    receipt?: string;
    refId?: string;
  };
};

async function sql(query: string, params: unknown[] = []) {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    return (await db.query(query, params)).rows;
  } finally {
    await db.end();
  }
}

async function signIn(request: APIRequestContext, email: string) {
  await clearMailbox(email);
  await request.post(`${API}/auth/email/request`, {
    data: { email, locale: "en" },
  });
  const res = await request.post(`${API}/auth/email/verify`, {
    data: {
      email,
      code: await readCode(email),
      locale: "en",
      device: { platform: "ios" },
    },
  });
  expect(res.ok()).toBe(true);
  const { token } = await res.json();
  return { Authorization: `Bearer ${token}` };
}

const devToken = (name: string) =>
  `ExponentPushToken[dev-e2e-${name}-${Date.now()}]`;
const outboxFile = (token: string) =>
  path.join(OUTBOX, `${token.replace(/[^A-Za-z0-9_-]/g, "_")}.jsonl`);

async function pushed(token: string): Promise<Pushed[]> {
  const text = await readFile(outboxFile(token), "utf8").catch(() => "");
  return text
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Pushed);
}

/** Wait for the device's n-th push (chat pushes are sent after the response). */
async function nthPush(token: string, n: number): Promise<Pushed> {
  for (let i = 0; i < 50; i++) {
    const all = await pushed(token);
    if (all.length >= n) return all[n - 1];
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`No push #${n} to ${token}`);
}

async function register(
  request: APIRequestContext,
  auth: Record<string, string>,
  token: string,
) {
  await rm(outboxFile(token), { force: true });
  const res = await request.put(`${API}/push`, {
    headers: auth,
    data: { token, platform: "ios" },
  });
  expect(res.ok()).toBe(true);
  return res.json();
}

test.describe("app notifications API", () => {
  test("register → test push → routes to the app → unregister", async ({
    request,
  }) => {
    const { id, email } = await createActiveGraduate("Push One", "1990-06-01");
    // Notifications are written in the member's saved language.
    await sql(`UPDATE "User" SET locale = 'en' WHERE id = $1`, [id]);
    const auth = await signIn(request, email);

    const empty = await (
      await request.get(`${API}/push`, { headers: auth })
    ).json();
    expect(empty).toEqual({ devTokens: true, device: null, otherDevices: 0 });

    const bad = await request.put(`${API}/push`, {
      headers: auth,
      data: { token: "apns:abcdef", platform: "ios" },
    });
    expect(bad.status()).toBe(400);
    expect((await bad.json()).error).toBe("invalid_token");
    // Nothing without a session.
    expect(
      (
        await request.put(`${API}/push`, {
          data: { token: devToken("anon"), platform: "ios" },
        })
      ).status(),
    ).toBe(401);

    const token = devToken("one");
    const state = await register(request, auth, token);
    expect(state.device).toMatchObject({
      enabled: true,
      platform: "ios",
      failed: false,
    });

    const test1 = await request.post(`${API}/push/test`, { headers: auth });
    expect(test1.ok()).toBe(true);
    const sent = await nthPush(token, 1);
    expect(sent).toMatchObject({
      to: token,
      title: "🔔 Test notification",
      data: { v: 1, kind: "TEST", path: "/app/settings" },
    });
    const again = await request.post(`${API}/push/test`, { headers: auth });
    expect(again.status()).toBe(429);
    expect((await again.json()).error).toBe("too_soon");

    // Settings say where notifications go now.
    const settings = await (
      await request.get(`${API}/settings`, { headers: auth })
    ).json();
    expect(settings.notify.route).toBe("PUSH");

    const off = await (
      await request.delete(`${API}/push`, { headers: auth })
    ).json();
    expect(off.device).toBeNull();
    const after = await (
      await request.get(`${API}/settings`, { headers: auth })
    ).json();
    expect(after.notify.route).toBe("EMAIL");
    expect(
      (await request.post(`${API}/push/test`, { headers: auth })).status(),
    ).toBe(409);
  });

  test("a follow request: push with actions, the list, read receipts", async ({
    request,
  }) => {
    const stamp = Date.now();
    const a = await createActiveGraduate(`Pa Sender${stamp}`, "1990-07-01");
    const b = await createActiveGraduate(`Pb Getter${stamp}`, "1990-08-01");
    const authA = await signIn(request, a.email);
    const authB = await signIn(request, b.email);
    const token = devToken("follow");
    await register(request, authB, token);

    const follow = await request.post(`${API}/members/${b.id}/follow`, {
      headers: authA,
    });
    expect((await follow.json()).status).toBe("REQUESTED");
    const [{ id: followId }] = await sql(
      `SELECT id FROM "Follow" WHERE "followerId" = $1 AND "followeeId" = $2`,
      [a.id, b.id],
    );

    const push = await nthPush(token, 1);
    expect(push.categoryId).toBe("follow_request");
    expect(push.badge).toBeGreaterThanOrEqual(1);
    expect(push.data).toMatchObject({
      kind: "FOLLOW_REQUEST",
      category: "social",
      refId: followId,
    });
    expect(push.data.receipt).toMatch(/^[0-9A-Za-z]{8}$/);
    // Sent to the app instead of email.
    const [log] = await sql(
      `SELECT channels FROM "NotificationReceipt" r JOIN "NotificationLink" l ON l.id = r."linkId"
       WHERE r."userId" = $1 AND l.kind = 'FOLLOW_REQUEST'`,
      [b.id],
    );
    expect(log.channels).toEqual(["PUSH"]);

    // お知らせ: listed, unread, counted on the bell.
    const page = await (
      await request.get(`${API}/notifications`, { headers: authB })
    ).json();
    const item = page.items.find(
      (i: { kind: string }) => i.kind === "FOLLOW_REQUEST",
    );
    expect(item).toMatchObject({
      category: "social",
      emoji: "👤",
      read: false,
      channels: ["PUSH"],
    });
    expect(item.path).toMatch(/^\/app\/follows/);
    expect(page.unread).toBeGreaterThanOrEqual(1);
    const me = await (
      await request.get(`${API}/me`, { headers: authB })
    ).json();
    expect(me.badges.inbox).toBe(page.unread);

    // Only the recipient can open it (a tap on the push sends its receipt).
    const foreign = await request.post(`${API}/notifications/open`, {
      headers: authA,
      data: { token: push.data.receipt },
    });
    expect(foreign.status()).toBe(404);
    const opened = await request.post(`${API}/notifications/open`, {
      headers: authB,
      data: { token: push.data.receipt },
    });
    expect((await opened.json()).path).toBe(item.path);
    const [receipt] = await sql(
      `SELECT "openedAt", opens FROM "NotificationReceipt" WHERE id = $1`,
      [item.id],
    );
    expect(receipt.openedAt).not.toBeNull();
    expect(receipt.opens).toBe(1);

    const read = await request.post(`${API}/notifications/read`, {
      headers: authB,
      data: {},
    });
    expect((await read.json()).unread).toBe(0);

    // The quick action: accept from the notification.
    const accept = await request.post(
      `${API}/follows/requests/${followId}/accept`,
      { headers: authB },
    );
    expect((await accept.json()).accepted).toBe(true);
  });

  test("chat: 1:1 messages and a group's notification level", async ({
    request,
  }) => {
    const stamp = Date.now();
    const a = await createActiveGraduate(`Ca Writer${stamp}`, "1990-09-01");
    const b = await createActiveGraduate(`Cb Reader${stamp}`, "1990-10-01");
    await sql(
      `INSERT INTO "Follow" (id, "followerId", "followeeId", status) VALUES
       ($1, $3, $4, 'ACCEPTED'), ($2, $4, $3, 'ACCEPTED')`,
      [`pf1${stamp}`, `pf2${stamp}`, a.id, b.id],
    );
    const authA = await signIn(request, a.email);
    const authB = await signIn(request, b.email);
    const token = devToken("chat");
    await register(request, authB, token);

    // 1:1: pushed right away, never the text.
    const { groupId: dm } = await (
      await request.post(`${API}/chat/direct`, {
        headers: authA,
        data: { userId: b.id },
      })
    ).json();
    await request.post(`${API}/chat/${dm}/messages`, {
      headers: authA,
      data: { body: "secret plans" },
    });
    const direct = await nthPush(token, 1);
    expect(direct).toMatchObject({
      categoryId: "chat_message",
      threadId: `chat-${dm}`,
      data: { kind: "CHAT_DIRECT", path: `/app/chat/${dm}`, refId: dm },
    });
    expect(`${direct.title} ${direct.body}`).not.toContain("secret");
    expect(direct.data.receipt).toBeUndefined();
    // 1:1 talks have no levels.
    const level = await request.put(`${API}/chat/${dm}/notifications`, {
      headers: authB,
      data: { level: "all" },
    });
    expect(level.status()).toBe(400);

    // A group both are in (graduates share 元在校生).
    const rowsOf = async (auth: Record<string, string>) =>
      (
        (await (await request.get(`${API}/chat`, { headers: auth })).json())
          .rows as { id: string; direct: boolean; joined: boolean }[]
      ).filter((r) => !r.direct && r.joined);
    const mine = new Set((await rowsOf(authA)).map((r) => r.id));
    const group = (await rowsOf(authB)).find((r) => mine.has(r.id));
    expect(group).toBeTruthy();
    const gid = group?.id as string;
    const info = await (
      await request.get(`${API}/chat/${gid}/info`, { headers: authB })
    ).json();
    expect(info.notifyLevel).toBe("mentions");

    // "mentions" (default): a plain message isn't pushed, a mention is.
    await request.post(`${API}/chat/${gid}/messages`, {
      headers: authA,
      data: { body: `plain ${stamp}` },
    });
    await request.post(`${API}/chat/${gid}/messages`, {
      headers: authA,
      data: { body: `@${asListed(`Cb Reader${stamp}`)} hello` },
    });
    const mention = await nthPush(token, 2);
    expect(mention.data).toMatchObject({ kind: "CHAT_MENTION", refId: gid });
    expect(await pushed(token)).toHaveLength(2);

    // "all": every message.
    const all = await request.put(`${API}/chat/${gid}/notifications`, {
      headers: authB,
      data: { level: "all" },
    });
    expect(await all.json()).toEqual({ level: "all" });
    await request.post(`${API}/chat/${gid}/messages`, {
      headers: authA,
      data: { body: `everyone ${stamp}` },
    });
    const every = await nthPush(token, 3);
    expect(every.data).toMatchObject({ kind: "CHAT_GROUP", refId: gid });
    expect(every.body).toContain(`Writer${stamp}`);

    // "off": no daily summary either (muted), as the website's switch.
    await request.put(`${API}/chat/${gid}/notifications`, {
      headers: authB,
      data: { level: "off" },
    });
    const room = await (
      await request.get(`${API}/chat/${gid}`, { headers: authB })
    ).json();
    expect(room).toMatchObject({ notifyLevel: "off", muted: true });
    // Leave the shared group as other runs expect it.
    await request.put(`${API}/chat/${gid}/notifications`, {
      headers: authB,
      data: { level: "mentions" },
    });
  });
});
