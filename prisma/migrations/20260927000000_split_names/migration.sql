-- AlterTable
ALTER TABLE "User" ADD COLUMN     "firstNameKanji" TEXT,
ADD COLUMN     "firstNameRomaji" TEXT,
ADD COLUMN     "lastNameKanji" TEXT,
ADD COLUMN     "lastNameRomaji" TEXT,
ADD COLUMN     "middleNameRomaji" TEXT;


-- Backfill the parts from the existing combined names.
-- Romaji was entered as "Given Family" (e.g. "Taro Yamada"): first token =
-- first name, last token = last name, anything between = middle name(s).
UPDATE "User" u SET
  "firstNameRomaji"  = CASE WHEN cardinality(t.p) > 1 THEN t.p[1] END,
  "lastNameRomaji"   = t.p[cardinality(t.p)],
  "middleNameRomaji" = CASE WHEN cardinality(t.p) > 2
                         THEN array_to_string(t.p[2:cardinality(t.p) - 1], ' ') END
FROM (
  SELECT id, regexp_split_to_array(btrim("nameRomaji"), '\s+') AS p
  FROM "User" WHERE "nameRomaji" IS NOT NULL AND btrim("nameRomaji") <> ''
) t
WHERE u.id = t.id;

-- Kanji/kana was entered as "姓 名" or "姓名": split on the first half- or
-- full-width space; without a space the whole value becomes the last name.
UPDATE "User" u SET
  "lastNameKanji"  = t.p[1],
  "firstNameKanji" = CASE WHEN cardinality(t.p) > 1
                       THEN array_to_string(t.p[2:cardinality(t.p)], ' ') END
FROM (
  SELECT id, regexp_split_to_array(btrim("nameKanji", E' 　'), E'[ 　]+') AS p
  FROM "User" WHERE "nameKanji" IS NOT NULL AND btrim("nameKanji", E' 　') <> ''
) t
WHERE u.id = t.id;
