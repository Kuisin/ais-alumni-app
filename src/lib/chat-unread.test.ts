import { describe, expect, it } from "vitest";
import {
  alreadyNotified,
  pickUnreadNotices,
  type UnreadCandidate,
} from "./chat-unread";

const now = new Date("2026-10-01T12:00:00Z");
const ago = (min: number) => new Date(now.getTime() - min * 60_000);
const msg = (o: Partial<UnreadCandidate>): UnreadCandidate => ({
  id: "m1",
  groupId: "g1",
  senderId: "a",
  createdAt: ago(10),
  direct: true,
  mentionUserIds: [],
  members: [
    { userId: "a", lastReadAt: ago(10) },
    { userId: "b", lastReadAt: ago(60) },
  ],
  ...o,
});

describe("unread chat notices", () => {
  it("tells the other person about a 1:1 message unread for 5 minutes", () => {
    expect(pickUnreadNotices([msg({})], now)).toEqual([
      expect.objectContaining({
        kind: "CHAT_DIRECT",
        userId: "b",
        messageId: "m1",
        senderId: "a",
      }),
    ]);
  });
  it("waits 5 minutes, skips read ones and old backlog", () => {
    expect(pickUnreadNotices([msg({ createdAt: ago(3) })], now)).toEqual([]);
    const read = msg({
      members: [
        { userId: "a", lastReadAt: ago(10) },
        { userId: "b", lastReadAt: ago(8) },
      ],
    });
    expect(pickUnreadNotices([read], now)).toEqual([]);
    expect(pickUnreadNotices([msg({ createdAt: ago(180) })], now)).toEqual([]);
  });
  it("group chats: only people @mentioned, one notice per chat", () => {
    const group = (id: string, min: number, mentions: string[]) =>
      msg({
        id,
        createdAt: ago(min),
        direct: false,
        mentionUserIds: mentions,
        members: [
          { userId: "a", lastReadAt: ago(90) },
          { userId: "b", lastReadAt: ago(90) },
          { userId: "c", lastReadAt: ago(90) },
        ],
      });
    const notices = pickUnreadNotices(
      [group("m1", 30, ["b"]), group("m2", 20, ["b"]), group("m3", 10, [])],
      now,
    );
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({
      kind: "CHAT_MENTION",
      userId: "b",
      messageId: "m1",
    });
  });
  it("once per streak: not again until they've read the chat", () => {
    const n = { lastReadAt: ago(60) };
    expect(alreadyNotified(n, ago(20))).toBe(true);
    expect(alreadyNotified(n, ago(90))).toBe(false);
    expect(alreadyNotified(n, null)).toBe(false);
  });
});
