"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Field, Select } from "@/components/ui/field";
import { INDUSTRIES, type IndustryGroup } from "@/lib/industries";
import { JOB_TYPES } from "@/lib/job-types";

const LISTS = { industry: INDUSTRIES, jobType: JOB_TYPES } as const;

const groupOf = (list: IndustryGroup[], code?: string | null) =>
  code
    ? (list.find((g) => g.code === code || code.startsWith(`${g.code}-`))
        ?.code ?? "")
    : "";

/**
 * Two-level dropdown (業種 or 職種): the 大分類, then the detail within it.
 * Submits one code under `kind` (the detail, or the 大分類 if none).
 */
export function TwoLevelPicker({
  kind,
  idPrefix,
  defaultValue,
  error,
}: {
  kind: "industry" | "jobType";
  idPrefix: string;
  defaultValue?: string | null;
  error?: string | null;
}) {
  const t = useTranslations("history");
  const en = useLocale() === "en";
  const list: IndustryGroup[] = LISTS[kind];
  const [group, setGroup] = useState(groupOf(list, defaultValue));
  const [item, setItem] = useState(
    defaultValue && defaultValue !== group ? defaultValue : "",
  );
  const current = list.find((g) => g.code === group);
  const label = (x: { ja: string; en: string }) => (en ? x.en : x.ja);

  return (
    <fieldset className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
      <legend className="sr-only">{t(`fields.${kind}`)}</legend>
      <input type="hidden" name={kind} value={item || group} />
      <Field
        id={`${idPrefix}-${kind}`}
        label={t(`fields.${kind}`)}
        hint={t("twoLevelHint")}
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
            {list.map((g) => (
              <option key={g.code} value={g.code}>
                {label(g)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field
        id={`${idPrefix}-${kind}-detail`}
        label={t(`fields.${kind}Detail`)}
      >
        {(a) => (
          <Select
            {...a}
            value={item}
            disabled={!current}
            onChange={(e) => setItem(e.target.value)}
          >
            <option value="">
              {current ? t("industryDetailAny") : t(`pickGroup.${kind}`)}
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
