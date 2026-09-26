import { describe, expect, it } from "vitest";
import { parseRosterCsv } from "./csv";
import {
  bestNameSimilarity,
  bestRosterMatch,
  kanjiSimilarity,
  levenshtein,
  NAME_MATCH_THRESHOLD,
  ROSTER_MATCH_THRESHOLD,
  romajiSimilarity,
  scoreRosterRow,
} from "./roster";

const now = new Date("2026-09-26T00:00:00Z");
const d = (s: string) => new Date(`${s}T00:00:00Z`);

describe("name similarity (§6.4.1)", () => {
  it("computes edit distance", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("", "abc")).toBe(3);
  });

  it("ignores case, spacing, order and accents", () => {
    expect(romajiSimilarity("Taro Yamada", "YAMADA  taro")).toBe(1);
    expect(romajiSimilarity("Yamada Taro", "Yamadataro")).toBe(1);
    expect(romajiSimilarity("Taro Yamada", "Yamadataro")).toBe(1);
    expect(romajiSimilarity("José Ito", "jose ito")).toBe(1);
  });

  it("tolerates small typos and middle names", () => {
    expect(
      romajiSimilarity("Taro Yamada", "Taro Yamda"),
    ).toBeGreaterThanOrEqual(NAME_MATCH_THRESHOLD);
    expect(
      romajiSimilarity("Taro Yamada", "Taro James Yamada"),
    ).toBeGreaterThanOrEqual(0.9);
  });

  it("keeps different people apart", () => {
    expect(romajiSimilarity("Taro Yamada", "Hanako Suzuki")).toBeLessThan(0.5);
    expect(romajiSimilarity("Taro Yamada", "Jiro Yamada")).toBeLessThan(
      NAME_MATCH_THRESHOLD,
    );
  });

  it("compares kanji exactly or partially", () => {
    expect(kanjiSimilarity("山田 太郎", "山田太郎")).toBe(1);
    expect(kanjiSimilarity("山田太郎", "山田")).toBe(0.8);
    expect(kanjiSimilarity("山田太郎", "鈴木花子")).toBe(0);
  });

  it("never matches across scripts", () => {
    expect(bestNameSimilarity(["山田太郎"], ["Taro Yamada"])).toBe(0);
    expect(
      bestNameSimilarity(["山田太郎", "Taro Yamada"], [null, "yamada taro"]),
    ).toBe(1);
  });
});

describe("roster scoring", () => {
  const row = {
    id: "r1",
    nameRomaji: "Yamada Taro",
    nameKanji: "山田太郎",
    dateOfBirth: d("2000-04-02"),
    yearsFrom: 2006,
    yearsTo: 2018,
  };

  it("scores a perfect match 100", () => {
    expect(
      scoreRosterRow(
        {
          nameRomaji: "Taro Yamada",
          nameKanji: "山田 太郎",
          dateOfBirth: d("2000-04-02"),
          yearsFrom: 2006,
          yearsTo: 2018,
        },
        row,
        now,
      ),
    ).toBe(100);
  });

  it("scores name-only matches below a full match but above the threshold", () => {
    const s = scoreRosterRow(
      { nameRomaji: "Taro Yamada", dateOfBirth: null },
      row,
      now,
    );
    expect(s).toBe(80);
    expect(s).toBeGreaterThanOrEqual(ROSTER_MATCH_THRESHOLD);
  });

  it("penalises a wrong DOB and non-overlapping years", () => {
    const s = scoreRosterRow(
      {
        nameRomaji: "Taro Yamada",
        dateOfBirth: d("1990-01-01"),
        yearsFrom: 1995,
        yearsTo: 1999,
      },
      row,
      now,
    );
    expect(s).toBe(60);
  });

  it("gives partial credit for day/month swaps and partial overlap", () => {
    const s = scoreRosterRow(
      {
        nameRomaji: "Taro Yamada",
        dateOfBirth: d("2000-02-04"),
        yearsFrom: 2012,
        yearsTo: 2020,
      },
      row,
      now,
    );
    expect(s).toBeGreaterThan(60);
    expect(s).toBeLessThan(100);
  });

  it("returns null with no roster rows and picks the best row otherwise", () => {
    expect(
      bestRosterMatch({ nameRomaji: "x", dateOfBirth: null }, [], now),
    ).toBeNull();
    const other = {
      ...row,
      id: "r2",
      nameRomaji: "Suzuki Hanako",
      nameKanji: "鈴木花子",
    };
    expect(
      bestRosterMatch(
        { nameRomaji: "Taro Yamada", dateOfBirth: d("2000-04-02") },
        [other, row],
        now,
      )?.rowId,
    ).toBe("r1");
  });
});

describe("roster CSV", () => {
  it("parses rows with header, quotes and defaults", () => {
    const { rows, errors } = parseRosterCsv(
      'nameRomaji,nameKanji,dateOfBirth,yearsFrom,yearsTo,kind\r\n"Yamada, Taro",山田太郎,2000-04-02,2006,2018,former_student\nSuzuki Hanako,,,,,\n',
    );
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      nameRomaji: "Yamada, Taro",
      yearsFrom: 2006,
      kind: "FORMER_STUDENT",
    });
    expect(rows[0].dateOfBirth?.toISOString()).toBe("2000-04-02T00:00:00.000Z");
    expect(rows[1]).toMatchObject({
      nameKanji: null,
      dateOfBirth: null,
      kind: "FORMER_STUDENT",
    });
  });

  it("reports bad rows by line", () => {
    const { rows, errors } = parseRosterCsv(
      ",x\nA,,2000-02-30\nB,,,2010,2000\nC,,,,,PRINCIPAL\nD,,,20x0",
    );
    expect(rows).toHaveLength(0);
    expect(errors.map((e) => e.error)).toEqual([
      "missingName",
      "badDate",
      "yearsOrder",
      "badKind",
      "badYear",
    ]);
  });
});
