import { describe, expect, it } from "vitest";
import en from "../../messages/en/line.json";
import ja from "../../messages/ja/line.json";
import { welcomeMessages } from "./line-welcome";

const fill =
  (dict: Record<string, string>) => (k: string, v?: Record<string, string>) =>
    (dict[k] ?? k).replace(/\{(\w+)\}/g, (_, n) => v?.[n] ?? "");
const tr = { ja: fill(ja.welcome), en: fill(en.welcome) };
const appUrl = (p: string) => `https://ais.kai-lab.net${p}`;

describe("LINE welcome message", () => {
  it("greets a linked member by name in their language", () => {
    const msgs = welcomeMessages(tr, {
      member: { name: "鈴木花子", locale: "ja" },
      isUnblocked: false,
      appUrl,
    });
    expect(msgs).toHaveLength(2);
    const text = msgs[0].type === "text" ? msgs[0].text : "";
    expect(text).toContain("鈴木花子さん、友だち追加ありがとうございます");
    expect(text).toContain("連携済み");
    expect(text).toContain("AIS同窓会委員会");
    expect(text).toContain("https://ais.kai-lab.net/ja/privacy");
    expect(text).not.toContain("まだアプリと連携");
  });

  it("explains linking in Japanese and English to unknown users", () => {
    const msgs = welcomeMessages(tr, {
      member: null,
      isUnblocked: true,
      appUrl,
    });
    expect(msgs).toHaveLength(3);
    const [jaMsg, enMsg, buttons] = msgs;
    expect(jaMsg.type === "text" && jaMsg.text).toContain("おかえりなさい");
    expect(jaMsg.type === "text" && jaMsg.text).toContain("LINE を連携する");
    expect(enMsg.type === "text" && enMsg.text).toContain("Link LINE");
    if (buttons.type !== "template") throw new Error("expected buttons");
    expect(buttons.template.actions.map((a) => a.uri)).toContain(
      "https://ais.kai-lab.net/ja/app/settings#line",
    );
  });

  it("stays within LINE limits", () => {
    for (const member of [
      null,
      { name: "A".repeat(100), locale: "en" as const },
    ]) {
      for (const m of welcomeMessages(tr, {
        member,
        isUnblocked: false,
        appUrl,
      })) {
        if (m.type === "text") expect(m.text.length).toBeLessThanOrEqual(5000);
        else {
          expect(m.template.text.length).toBeLessThanOrEqual(60);
          expect((m.template.title ?? "").length).toBeLessThanOrEqual(40);
          for (const a of m.template.actions)
            expect(a.label.length).toBeLessThanOrEqual(20);
          expect(m.altText.length).toBeLessThanOrEqual(400);
        }
      }
    }
  });
});
