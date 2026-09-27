"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Field, Select } from "@/components/ui/field";
import { INDUSTRIES, industryGroupOf } from "@/lib/industries";

/**
 * 業種: pick the 大分類, then the 中分類 within it. Submits one code as
 * `industry` (the 中分類, or the 大分類 if no detail is chosen).
 */
export function IndustryPicker({
  idPrefix,
  defaultValue,
  error,
}: {
  idPrefix: string;
  defaultValue?: string | null;
  error?: string | null;
}) {
  const t = useTranslations("history");
  const en = useLocale() === "en";
  const [group, setGroup] = useState(industryGroupOf(defaultValue));
  const [item, setItem] = useState(
    defaultValue && defaultValue !== group ? defaultValue : "",
  );
  const current = INDUSTRIES.find((g) => g.code === group);
  const label = (x: { ja: string; en: string }) => (en ? x.en : x.ja);

  return (
    <fieldset className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
      <legend className="sr-only">{t("fields.industry")}</legend>
      <input type="hidden" name="industry" value={item || group} />
      <Field
        id={`${idPrefix}-industry`}
        label={t("fields.industry")}
        hint={t("industryHint")}
        error={error}
      >
        {(a) => (
          <Select
            {...a}
            value={group}
            onChange={(e) => {
              setGroup(e.target.value);
              setItem("");
            }}
          >
            <option value="">{t("industryNone")}</option>
            {INDUSTRIES.map((g) => (
              <option key={g.code} value={g.code}>
                {label(g)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field
        id={`${idPrefix}-industry-detail`}
        label={t("fields.industryDetail")}
      >
        {(a) => (
          <Select
            {...a}
            value={item}
            disabled={!current}
            onChange={(e) => setItem(e.target.value)}
          >
            <option value="">
              {current ? t("industryDetailAny") : t("industryPickGroup")}
            </option>
            {current?.children.map((c) => (
              <option key={c.code} value={c.code}>
                {label(c)}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </fieldset>
  );
}
