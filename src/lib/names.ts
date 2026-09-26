import { z } from "zod";

/**
 * Members enter their name in parts: romaji last / first / optional middle,
 * and kanji/kana 姓 / 名. The combined `nameRomaji` / `nameKanji` columns are
 * derived from the parts and used for display, search and sorting.
 */
export type NameParts = {
  lastNameRomaji: string | null;
  firstNameRomaji: string | null;
  middleNameRomaji: string | null;
  lastNameKanji: string | null;
  firstNameKanji: string | null;
};

function clean(s: string | null | undefined): string | null {
  const v = s?.replace(/[\s　]+/g, " ").trim();
  return v ? v : null;
}

function join(parts: (string | null)[], sep: string): string | null {
  const v = parts.filter((p): p is string => Boolean(p)).join(sep);
  return v || null;
}

/** "First Middle Last", e.g. "Taro Yamada" or "Emma Rose Brown". */
export function composeRomaji(
  p: Pick<NameParts, "lastNameRomaji" | "firstNameRomaji" | "middleNameRomaji">,
): string | null {
  return join(
    [
      clean(p.firstNameRomaji),
      clean(p.middleNameRomaji),
      clean(p.lastNameRomaji),
    ],
    " ",
  );
}

/** "姓 名", e.g. "山田 太郎". */
export function composeKanji(
  p: Pick<NameParts, "lastNameKanji" | "firstNameKanji">,
): string | null {
  return join([clean(p.lastNameKanji), clean(p.firstNameKanji)], " ");
}

/** Normalised parts plus the derived combined names, ready to write to User. */
export function nameColumns(p: NameParts) {
  const parts: NameParts = {
    lastNameRomaji: clean(p.lastNameRomaji),
    firstNameRomaji: clean(p.firstNameRomaji),
    middleNameRomaji: clean(p.middleNameRomaji),
    lastNameKanji: clean(p.lastNameKanji),
    firstNameKanji: clean(p.firstNameKanji),
  };
  return {
    ...parts,
    nameRomaji: composeRomaji(parts),
    nameKanji: composeKanji(parts),
  };
}

/** Form defaults for a user row (parts may be null on legacy rows). */
export function namePartsOf(
  u: Partial<NameParts>,
): Record<keyof NameParts, string> {
  return {
    lastNameRomaji: u.lastNameRomaji ?? "",
    firstNameRomaji: u.firstNameRomaji ?? "",
    middleNameRomaji: u.middleNameRomaji ?? "",
    lastNameKanji: u.lastNameKanji ?? "",
    firstNameKanji: u.firstNameKanji ?? "",
  };
}

const part = (required: boolean) =>
  required
    ? z.string().trim().min(1).max(50)
    : z
        .string()
        .trim()
        .max(50)
        .transform((v) => v || null);

/** Validates the five name inputs of a profile/admin form (romaji required). */
export const nameFormSchema = z.object({
  lastNameRomaji: part(true),
  firstNameRomaji: part(true),
  middleNameRomaji: part(false),
  lastNameKanji: part(false),
  firstNameKanji: part(false),
});

export const NAME_FIELDS = [
  "lastNameRomaji",
  "firstNameRomaji",
  "middleNameRomaji",
  "lastNameKanji",
  "firstNameKanji",
] as const;

/** Read the five name inputs from FormData (missing → ""). */
export function nameFormInput(fd: FormData): Record<keyof NameParts, string> {
  return Object.fromEntries(
    NAME_FIELDS.map((k) => [k, String(fd.get(k) ?? "")]),
  ) as Record<keyof NameParts, string>;
}
