import { describe, expect, it } from "vitest";
import { composeKanji, composeRomaji, nameColumns } from "./names";

describe("names", () => {
  it("composes romaji as Last, First Middle", () => {
    expect(
      composeRomaji({
        firstNameRomaji: "Taro",
        middleNameRomaji: null,
        lastNameRomaji: "Yamada",
      }),
    ).toBe("Yamada, Taro");
    expect(
      composeRomaji({
        firstNameRomaji: "Emma",
        middleNameRomaji: "Rose",
        lastNameRomaji: "Brown",
      }),
    ).toBe("Brown, Emma Rose");
    expect(
      composeRomaji({
        firstNameRomaji: "Emma",
        middleNameRomaji: null,
        lastNameRomaji: null,
      }),
    ).toBe("Emma");
  });
  it("composes kanji as 姓 名", () => {
    expect(
      composeKanji({ lastNameKanji: "山田", firstNameKanji: "太郎" }),
    ).toBe("山田 太郎");
    expect(
      composeKanji({ lastNameKanji: "スミス", firstNameKanji: null }),
    ).toBe("スミス");
  });
  it("trims, collapses spaces (incl. full-width) and nulls empties", () => {
    const c = nameColumns({
      lastNameRomaji: "  Yamada ",
      firstNameRomaji: "Taro",
      middleNameRomaji: "   ",
      lastNameKanji: "山田　",
      firstNameKanji: "",
    });
    expect(c).toMatchObject({
      lastNameRomaji: "Yamada",
      middleNameRomaji: null,
      firstNameKanji: null,
      nameRomaji: "Yamada, Taro",
      nameKanji: "山田",
    });
  });
  it("returns null combined names when nothing is entered", () => {
    const c = nameColumns({
      lastNameRomaji: null,
      firstNameRomaji: null,
      middleNameRomaji: null,
      lastNameKanji: null,
      firstNameKanji: null,
    });
    expect(c.nameRomaji).toBeNull();
    expect(c.nameKanji).toBeNull();
  });
});
