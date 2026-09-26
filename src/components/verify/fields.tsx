"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Field, Input, Select } from "@/components/ui/field";
import { MIN_YEAR, maxYear } from "@/lib/verification/schema";

/** Stable DOM id for a form path, e.g. "formerStudent.yearsTo" → "f-formerStudent-yearsTo". */
export function fieldId(path: string): string {
  return `f-${path.replaceAll(".", "-")}`;
}

export type Errors = Record<string, string>;

const GRADES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const; // 0 = K

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
}: {
  path: string;
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  errors: Errors;
  required?: boolean;
  disabled?: boolean;
}) {
  const error = useError(errors, path);
  return (
    <Field
      id={fieldId(path)}
      label={label}
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

export function GradeSelect({
  path,
  label,
  value,
  onChange,
  errors,
}: {
  path: string;
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  errors: Errors;
}) {
  const t = useTranslations("verify");
  const tr = useTranslations("roles");
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
          {GRADES.map((g) => (
            <option key={g} value={String(g)}>
              {tr("grade", { grade: g })}
            </option>
          ))}
        </Select>
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
