import { describe, expect, it } from "vitest";
import {
  ticketToken,
  ticketUrl,
  tokenFromScan,
  verifyTicket,
} from "./event-tickets";

const KEY = "test-secret";

describe("event tickets", () => {
  it("verifies a ticket only for its own event", () => {
    const t = ticketToken("ev1", "user1", KEY);
    expect(verifyTicket("ev1", t, KEY)).toBe("user1");
    expect(verifyTicket("ev2", t, KEY)).toBeNull();
  });

  it("rejects tampered or malformed tickets", () => {
    const t = ticketToken("ev1", "user1", KEY);
    const sig = t.split(".")[1];
    expect(verifyTicket("ev1", `user2.${sig}`, KEY)).toBeNull();
    expect(verifyTicket("ev1", "user1", KEY)).toBeNull();
    expect(verifyTicket("ev1", `${t}.x`, KEY)).toBeNull();
    expect(verifyTicket("ev1", "user1.abc", KEY)).toBeNull();
    expect(verifyTicket("ev1", t, "other-secret")).toBeNull();
  });

  it("reads the token from a scanned link or a bare token", () => {
    const t = ticketToken("ev1", "user1", KEY);
    expect(tokenFromScan(ticketUrl("ev1", t))).toBe(t);
    expect(tokenFromScan(`  ${t} `)).toBe(t);
    expect(tokenFromScan("https://example.com/x")).toBeNull();
    expect(tokenFromScan("")).toBeNull();
  });
});
