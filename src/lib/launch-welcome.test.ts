import { describe, expect, it } from "vitest";
import { LAUNCH_TYPES, launchAudience, launchPost } from "./launch-welcome";
import { renderMarkdown } from "./markdown";
import { audienceSpecSchema } from "./news-audience";

const sender = { nameKanji: "山田太郎", nameRomaji: "Taro Yamada" };

describe("launch welcome news", () => {
  it.each(LAUNCH_TYPES)("is a complete bilingual post for %s", (type) => {
    const p = launchPost(type, sender);
    expect(p.titleJa.length).toBeLessThanOrEqual(200);
    expect(p.titleEn.length).toBeLessThanOrEqual(200);
    expect(p.bodyJa).toContain("## かんたんな使い方");
    expect(p.bodyEn).toContain("## Getting started");
    expect(p.bodyJa).toContain("— 山田太郎");
    expect(p.bodyEn).toContain("— Taro Yamada");
    expect(renderMarkdown(p.bodyJa)).toContain("<ol>");
    expect(audienceSpecSchema.safeParse(launchAudience(type)).success).toBe(
      true,
    );
  });

  it("targets one member type per post", () => {
    expect(launchAudience("TEACHERS").groups).toEqual([
      "TEACHER_CURRENT",
      "TEACHER_FORMER",
    ]);
    expect(launchAudience("FORMER_STUDENTS").groups).toEqual([
      "FORMER_STUDENT",
    ]);
  });

  it("tells parents about linking family, graduates about work history", () => {
    expect(launchPost("CURRENT_PARENTS", sender).bodyJa).toContain("お子さま");
    expect(launchPost("FORMER_STUDENTS", sender).bodyJa).toContain(
      "学歴・職歴",
    );
    expect(launchPost("FORMER_STUDENTS", sender).bodyJa).not.toContain(
      "お子さま",
    );
  });

  it("falls back to the other name and drops a missing signature", () => {
    const p = launchPost("TEACHERS", { nameKanji: null, nameRomaji: "Taro" });
    expect(p.bodyJa).toContain("— Taro");
    const none = launchPost("TEACHERS", { nameKanji: null, nameRomaji: null });
    expect(none.bodyEn).not.toContain("— ");
  });
});
