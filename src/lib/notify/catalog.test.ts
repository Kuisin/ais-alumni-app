import { describe, expect, it } from "vitest";
import { NOTIFY_KINDS, type NotifyKind, wantsKind } from "./catalog";
import { isLinkToken, isUserCode, linkText, newLinkToken } from "./links";
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
  group: "第5期",
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

describe("link texts", () => {
  it("uses the opener's language, falling back for older links", () => {
    const texts = {
      ja: { title: "件名", body: "本文" },
      en: { title: "Title", body: "Body" },
    };
    expect(linkText({ texts, title: null, body: null }, "en").title).toBe(
      "Title",
    );
    expect(linkText({ texts, title: null, body: null }, "ja").body).toBe(
      "本文",
    );
    expect(
      linkText({ texts: null, title: "旧", body: "旧本文" }, "en"),
    ).toEqual({ title: "旧", body: "旧本文" });
  });
});

describe("LINE is for ニュース, unread chat notices and committee decisions", () => {
  it("no other kind may use LINE", () => {
    const lineKinds = (Object.keys(NOTIFY_KINDS) as NotifyKind[]).filter(
      (k) => "line" in NOTIFY_KINDS[k],
    );
    expect(lineKinds.sort()).toEqual([
      "BIRTH_DATE_REQUEST_APPROVED",
      "BIRTH_DATE_REQUEST_REJECTED",
      "CHAT_DIRECT",
      "CHAT_MENTION",
      "GENDER_REQUEST_APPROVED",
      "GENDER_REQUEST_REJECTED",
      "NAME_REQUEST_APPROVED",
      "NAME_REQUEST_REJECTED",
      "NEWS",
      "RECORD_REQUEST_APPROVED",
      "RECORD_REQUEST_REJECTED",
      "VERIFICATION_APPROVED",
      "VERIFICATION_NEEDS_INFO",
      "VERIFICATION_REJECTED",
    ]);
  });
  it("application results are also emailed", () => {
    for (const k of [
      "VERIFICATION_APPROVED",
      "VERIFICATION_REJECTED",
      "VERIFICATION_NEEDS_INFO",
    ] as const)
      expect("alwaysEmail" in NOTIFY_KINDS[k], k).toBe(true);
  });
});
