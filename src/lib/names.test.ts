import { describe, expect, it } from "vitest";
import { composeKanji, composeRomaji, nameColumns } from "./names";

describe("names", () => {
  it("composes romaji as First Middle Last", () => {
    expect(
      composeRomaji({
        firstNameRomaji: "Taro",
        middleNameRomaji: null,
        lastNameRomaji: "Yamada",
      }),
    ).toBe("Taro Yamada");
    expect(
      composeRomaji({
        firstNameRomaji: "Emma",
        middleNameRomaji: "Rose",
        lastNameRomaji: "Brown",
      }),
    ).toBe("Emma Rose Brown");
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
      nameRomaji: "Taro Yamada",
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
