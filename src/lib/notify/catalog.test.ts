import { describe, expect, it } from "vitest";
import { NOTIFY_KINDS, type NotifyKind, wantsKind } from "./catalog";
import { isLinkToken, isUserCode, newLinkToken } from "./links";
import { lineText, renderNotification } from "./render";

const PARAMS = {
  name: "Suzuki, Hanako",
  child: "Suzuki, Kid",
  method: "Google",
  count: 3,
  title: "Summer party",
  when: new Date("2030-07-01T09:00:00Z"),
  location: "Nagoya",
  stage: "Working",
  from: "Committee",
  years: "2008–2016",
};

describe("notification catalog", () => {
  it("renders every kind in both languages", async () => {
    for (const kind of Object.keys(NOTIFY_KINDS) as NotifyKind[])
      for (const locale of ["ja", "en"] as const) {
        const r = await renderNotification(kind, locale, PARAMS);
        expect(r.title, `${kind} ${locale}`).toBeTruthy();
        expect(r.body, `${kind} ${locale}`).toBeTruthy();
        expect(r.title).not.toMatch(/\{|kinds\./); // all values filled in
        expect(r.body).not.toMatch(/\{|kinds\./);
        expect(
          r.subject.startsWith(
            locale === "ja" ? "【AIS同窓会】" : "[AIS Alumni]",
          ),
        ).toBe(true);
      }
  });

  it("formats dates and optional venue by language", async () => {
    const ja = await renderNotification("EVENT_REMINDER_1D", "ja", PARAMS);
    expect(ja.body).toContain("Summer party");
    expect(ja.detail).toContain("場所：Nagoya");
    const en = await renderNotification("EVENT_REMINDER_1D", "en", {
      ...PARAMS,
      location: null,
    });
    expect(en.detail).not.toContain("Venue");
  });

  it("LINE text: emoji + title, one sentence, then button and link", async () => {
    const r = await renderNotification("NEWS", "ja", {});
    expect(lineText(r, "https://ais.kai-lab.net/n/Ab3dE6gH")).toBe(
      "📰 新しいニュースがあります\nAIS同窓会委員会からニュースが届きました。\n\nニュースを読む ▶ https://ais.kai-lab.net/n/Ab3dE6gH",
    );
  });

  it("members can turn categories off, except account", () => {
    expect(wantsKind(["news"], "NEWS")).toBe(false);
    expect(wantsKind(["news"], "EVENT_REMINDER_1D")).toBe(true);
    expect(wantsKind(["account"], "VERIFICATION_APPROVED")).toBe(true);
    expect(wantsKind(undefined, "CHAT_MENTION")).toBe(true);
  });

  it("short link tokens are 8 base62 characters", () => {
    const t = newLinkToken();
    expect(isLinkToken(t)).toBe(true);
    expect(isLinkToken("abc")).toBe(false);
    expect(isLinkToken("Ab3dE6g!")).toBe(false);
    expect(isUserCode("aB3xY9")).toBe(true);
    expect(isUserCode("aB3xY9z")).toBe(false);
  });
});
