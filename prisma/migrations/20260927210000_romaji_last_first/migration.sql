-- Romaji names are shown as "Last, First Middle" everywhere (src/lib/names.ts
-- composeRomaji). Recompute the combined column from the stored parts; rows
-- without parts (older data) keep their value.
UPDATE "User"
SET "nameRomaji" = CASE
  WHEN NULLIF(btrim("lastNameRomaji"), '') IS NULL
    THEN NULLIF(btrim(concat_ws(' ', NULLIF(btrim("firstNameRomaji"), ''), NULLIF(btrim("middleNameRomaji"), ''))), '')
  ELSE concat_ws(', ',
    btrim("lastNameRomaji"),
    NULLIF(btrim(concat_ws(' ', NULLIF(btrim("firstNameRomaji"), ''), NULLIF(btrim("middleNameRomaji"), ''))), ''))
END
WHERE NULLIF(btrim("lastNameRomaji"), '') IS NOT NULL
   OR NULLIF(btrim("firstNameRomaji"), '') IS NOT NULL;
