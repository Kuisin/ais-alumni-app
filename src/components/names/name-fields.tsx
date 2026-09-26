"use client";

import { useTranslations } from "next-intl";
import { Field, Input } from "@/components/ui/field";
import type { NameParts } from "@/lib/names";

type Values = Record<keyof NameParts, string>;

/**
 * Uncontrolled name inputs (romaji last / first / middle, kanji 姓 / 名) for
 * server-action forms. `error(field)` returns a message for invalid fields.
 */
export function NameFields({
  values,
  error,
  idPrefix = "",
}: {
  values: Values;
  error: (field: keyof NameParts) => string | null;
  idPrefix?: string;
}) {
  const t = useTranslations("common.names");
  const input = (
    name: keyof NameParts,
    opts: { required?: boolean; autoComplete?: string; lang: string },
  ) => (
    <Field
      id={`${idPrefix}${name}`}
      label={t(name)}
      required={opts.required}
      error={error(name)}
    >
      {(a) => (
        <Input
          {...a}
          name={name}
          defaultValue={values[name]}
          maxLength={50}
          autoComplete={opts.autoComplete}
          lang={opts.lang}
          placeholder={t(`placeholders.${name}`)}
        />
      )}
    </Field>
  );

  return (
    <>
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-slate-800">
          {t("romaji")}
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {input("lastNameRomaji", {
            required: true,
            autoComplete: "family-name",
            lang: "en",
          })}
          {input("firstNameRomaji", {
            required: true,
            autoComplete: "given-name",
            lang: "en",
          })}
        </div>
        {input("middleNameRomaji", {
          autoComplete: "additional-name",
          lang: "en",
        })}
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-slate-800">
          {t("kanji")}
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {input("lastNameKanji", { lang: "ja" })}
          {input("firstNameKanji", { lang: "ja" })}
        </div>
      </fieldset>
    </>
  );
}
