import { describe, expect, it } from "vitest";
import { MAX_CHAT_MESSAGE } from "./chat";
import { LAUNCH_KINDS, LAUNCH_TITLE_JA, launchMessage } from "./launch-welcome";

const sender = { nameKanji: "山田太郎", nameRomaji: "Taro Yamada" };

describe("launch welcome message", () => {
  it.each(LAUNCH_KINDS)("fits one chat message for %s", (kind) => {
    const text = launchMessage(kind, sender);
    expect(text.length).toBeLessThanOrEqual(MAX_CHAT_MESSAGE);
    expect(text.startsWith(LAUNCH_TITLE_JA)).toBe(true);
    expect(text).toContain("【かんたんな使い方】");
    expect(text).toContain("[Getting started]");
    expect(text).toContain("— 山田太郎");
    expect(text).toContain("— Taro Yamada");
  });

  it("tells parents about linking family, not graduates", () => {
    expect(launchMessage("CURRENT_PARENTS", sender)).toContain("お子さま");
    expect(launchMessage("FORMER_STUDENTS", sender)).toContain("学歴・職歴");
    expect(launchMessage("FORMER_STUDENTS", sender)).not.toContain("お子さま");
  });

  it("falls back to the other name and drops a missing signature", () => {
    const text = launchMessage("TEACHERS", {
      nameKanji: null,
      nameRomaji: "Taro Yamada",
    });
    expect(text).toContain("— Taro Yamada\n\n――");
    expect(
      launchMessage("TEACHERS", { nameKanji: null, nameRomaji: null }),
    ).not.toContain("— ");
  });
});
