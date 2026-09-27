"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useState } from "react";
import { Field, Input, Select } from "@/components/ui/field";
import type { CohortChoice } from "@/lib/cohorts";
import { MIN_YEAR, maxYear } from "@/lib/verification/schema";

/** Stable DOM id for a form path, e.g. "formerStudent.yearsTo" → "f-formerStudent-yearsTo". */
export function fieldId(path: string): string {
  return `f-${path.replaceAll(".", "-")}`;
}

export type Errors = Record<string, string>;

function useError(errors: Errors, path: string): string | null {
  const t = useTranslations("verify");
  const code = errors[path];
  return code ? t(`errors.${code}`) : null;
}

export function OptionalLabel({ children }: { children: ReactNode }) {
  const t = useTranslations("verify");
  return (
    <>
      {children}{" "}
      <span className="font-normal text-slate-500">({t("optional")})</span>
    </>
  );
}

export function TextInput({
  path,
  label,
  value,
  onChange,
  errors,
  required,
  hint,
  type = "text",
  autoComplete,
  lang,
  placeholder,
  maxLength,
}: {
  path: string;
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  errors: Errors;
  required?: boolean;
  hint?: ReactNode;
  type?: "text" | "date" | "email";
  autoComplete?: string;
  lang?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  const error = useError(errors, path);
  return (
    <Field
      id={fieldId(path)}
      label={required ? label : <OptionalLabel>{label}</OptionalLabel>}
      required={required}
      hint={hint}
      error={error}
    >
      {(aria) => (
        <Input
          {...aria}
          type={type}
          autoComplete={autoComplete}
          lang={lang}
          placeholder={placeholder}
          maxLength={maxLength}
          value={value}
          max={
            type === "date" ? new Date().toISOString().slice(0, 10) : undefined
          }
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  );
}

export function YearInput({
  path,
  label,
  value,
  onChange,
  errors,
  required = true,
  disabled,
  hint,
}: {
  path: string;
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  errors: Errors;
  required?: boolean;
  disabled?: boolean;
  hint?: ReactNode;
}) {
  const error = useError(errors, path);
  return (
    <Field
      id={fieldId(path)}
      label={required ? label : <OptionalLabel>{label}</OptionalLabel>}
      hint={hint}
      required={required && !disabled}
      error={error}
    >
      {(aria) => (
        <Input
          {...aria}
          type="number"
          inputMode="numeric"
          min={MIN_YEAR}
          max={maxYear()}
          step={1}
          placeholder="2015"
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  );
}

export function EnumSelect({
  path,
  label,
  value,
  onChange,
  errors,
  options,
}: {
  path: string;
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  errors: Errors;
  options: { value: string; label: string }[];
}) {
  const t = useTranslations("verify");
  const error = useError(errors, path);
  return (
    <Field id={fieldId(path)} label={label} required error={error}>
      {(aria) => (
        <Select
          {...aria}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{t("select")}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

/** Error line for a group (fieldset) rather than a single control. */
export function GroupError({ errors, path }: { errors: Errors; path: string }) {
  const error = useError(errors, path);
  if (!error) return null;
  return (
    <p id={fieldId(path)} tabIndex={-1} className="text-sm text-red-700">
      {error}
    </p>
  );
}

/**
 * 学年 picker: a 卒業済み / 在校中 / all toggle filters the list. Optional:
 * "not listed / not sure" leaves it empty for the committee to fill in.
 */
export function CohortPicker({
  path,
  value,
  onChange,
  errors,
  cohorts,
  defaultFilter,
  required = false,
}: {
  path: string;
  value: string;
  onChange: (v: string) => void;
  errors: Errors;
  cohorts: CohortChoice[];
  defaultFilter: "graduated" | "current" | "all";
  required?: boolean;
}) {
  const t = useTranslations("verify");
  const error = useError(errors, path);
  const selected = cohorts.find((c) => c.value === value);
  const [filter, setFilter] = useState<"graduated" | "current" | "all">(
    selected ? (selected.graduated ? "graduated" : "current") : defaultFilter,
  );
  const shown = cohorts.filter(
    (c) =>
      filter === "all" ||
      (filter === "graduated") === c.graduated ||
      c.value === value,
  );
  return (
    <div className="space-y-2">
      <fieldset>
        <legend className="text-sm font-medium text-slate-800">
          {t("fields.cohortFilter")}
        </legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {(["graduated", "current", "all"] as const).map((f) => (
            <label
              key={f}
              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm ${filter === f ? "border-brand-700 bg-brand-50 font-medium" : "border-slate-300"}`}
            >
              <input
                type="radio"
                className="sr-only"
                name={`${path}-filter`}
                checked={filter === f}
                onChange={() => setFilter(f)}
              />
              {t(`cohortFilter.${f}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <Field
        id={fieldId(path)}
        label={
          required ? (
            t("fields.cohort")
          ) : (
            <OptionalLabel>{t("fields.cohort")}</OptionalLabel>
          )
        }
        required={required}
        hint={t("hints.cohort")}
        error={error}
      >
        {(aria) => (
          <Select
            {...aria}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">
              {required ? t("select") : t("cohortNotListed")}
            </option>
            {shown.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </div>
  );
}
