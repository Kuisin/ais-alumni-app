"use client";

import {
  Check,
  Loader2,
  type LucideIcon,
  Search,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type KeyboardEvent,
  type ReactNode,
  useState,
  useTransition,
} from "react";
import { searchRegisteredChildAction } from "@/app/actions/verify";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import type { CohortChoice } from "@/lib/cohorts";
import type { ChildMode, ChildState } from "@/lib/verification/schema";
import {
  CohortPicker,
  type Errors,
  fieldId,
  TextInput,
  YearInput,
} from "./fields";
import { Preview, useStudentPreview } from "./student-preview";

type Found = Awaited<ReturnType<typeof searchRegisteredChildAction>>;

const MODE_ICON: Record<ChildMode, LucideIcon> = {
  existing: UserCheck,
  new: UserPlus,
};

/** Existing first: linking a registered child avoids a duplicate record. */
const MODE_ORDER: ChildMode[] = ["existing", "new"];

/**
 * One child in the parent's お子さま step: either pick an already-registered
 * member (exact name + birth date search) or enter a new child's details.
 */
export function ChildRow({
  index,
  value,
  onChange,
  onRemove,
  errors,
  cohorts,
}: {
  index: number;
  value: ChildState;
  onChange: (patch: Partial<ChildState>) => void;
  onRemove: (() => void) | null;
  errors: Errors;
  cohorts: CohortChoice[];
}) {
  const t = useTranslations("verify");
  const base = `parent.children.${index}`;
  const headingId = `${fieldId(base)}-heading`;
  return (
    <li
      className="animate-rise space-y-4 rounded-xl bg-slate-50 p-3 sm:p-4"
      aria-labelledby={headingId}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id={headingId} className="text-sm font-semibold">
          {t("childN", { n: index + 1 })}
        </h3>
        {onRemove ? (
          <Button
            variant="ghost"
            onClick={onRemove}
            aria-label={t("removeChildN", { n: index + 1 })}
          >
            {t("removeChild")}
          </Button>
        ) : null}
      </div>
      <ModeChoice
        name={`${fieldId(base)}-mode`}
        value={value.mode}
        onChange={(mode) => onChange({ mode })}
      />
      {value.mode === "existing" ? (
        <ExistingChild
          base={base}
          value={value}
          onChange={onChange}
          errors={errors}
        />
      ) : (
        <NewChild
          base={base}
          value={value}
          onChange={onChange}
          errors={errors}
          cohorts={cohorts}
        />
      )}
    </li>
  );
}

function ModeChoice({
  name,
  value,
  onChange,
}: {
  name: string;
  value: ChildMode;
  onChange: (m: ChildMode) => void;
}) {
  const t = useTranslations("verify.child");
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-800">
        {t("modeLegend")}
      </legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {MODE_ORDER.map((m) => {
          const on = value === m;
          const Icon = MODE_ICON[m];
          return (
            <label
              key={m}
              className={`relative flex min-h-11 cursor-pointer gap-3 rounded-xl border-2 p-3 transition motion-reduce:transition-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-700 ${
                on
                  ? "border-brand-700 bg-brand-50"
                  : "border-slate-200 bg-white hover:border-brand-100"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={m}
                className="sr-only"
                checked={on}
                onChange={() => onChange(m)}
                aria-describedby={`${name}-${m}-desc`}
              />
              <Icon
                aria-hidden="true"
                className={`mt-0.5 size-5 shrink-0 ${on ? "text-brand-700" : "text-slate-500"}`}
              />
              <span className="flex flex-col gap-1">
                <span className="font-semibold">{t(`modes.${m}.title`)}</span>
                <span
                  id={`${name}-${m}-desc`}
                  className="text-sm text-slate-600"
                >
                  {t(`modes.${m}.description`)}
                </span>
              </span>
              {on ? (
                <Check
                  aria-hidden="true"
                  className="absolute right-2 top-2 size-4 text-brand-700"
                />
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

type SectionArgs = {
  base: string;
  value: ChildState;
  onChange: (patch: Partial<ChildState>) => void;
  errors: Errors;
};

function ExistingChild({ base, value, onChange, errors }: SectionArgs) {
  const t = useTranslations("verify");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [results, setResults] = useState<Found | null>(null);
  const [problem, setProblem] = useState<"incomplete" | "failed" | null>(null);
  const [pickedCohort, setPickedCohort] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const errorCode =
    errors[`${base}.existingUserId`] ?? errors[`${base}.name`] ?? null;
  const inputId = fieldId(`${base}.existingUserId`);

  const search = () => {
    if (name.trim().length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      setProblem("incomplete");
      setResults(null);
      return;
    }
    setProblem(null);
    startTransition(async () => {
      try {
        setResults(
          await searchRegisteredChildAction({ name, dateOfBirth: dob }),
        );
      } catch {
        setResults(null);
        setProblem("failed");
      }
    });
  };
  // Enter in a search box searches instead of submitting the wizard.
  const onEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      search();
    }
  };

  if (value.existingUserId) {
    return (
      <div className="space-y-3">
        <div className="animate-fade flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-brand-700 bg-white p-3">
          <p className="flex items-center gap-2">
            <Check aria-hidden="true" className="size-5 text-brand-700" />
            <span className="sr-only">{t("child.selected")}: </span>
            <span className="font-semibold">{value.name}</span>
            {pickedCohort ? (
              <span className="text-sm text-slate-600">{pickedCohort}</span>
            ) : null}
          </p>
          <Button
            variant="ghost"
            onClick={() => onChange({ existingUserId: "", name: "" })}
            aria-label={t("child.changeNamed", { name: value.name })}
          >
            {t("child.change")}
          </Button>
        </div>
        <p className="text-sm text-slate-600">{t("child.confirmNote")}</p>
      </div>
    );
  }

  let status: ReactNode = null;
  if (pending) {
    status = (
      <span className="flex items-center gap-2 text-slate-600">
        <Loader2
          aria-hidden="true"
          className="size-4 animate-spin motion-reduce:animate-none"
        />
        {t("child.searching")}
      </span>
    );
  } else if (problem) {
    status = (
      <span className="text-red-700">
        {t(
          problem === "failed"
            ? "child.searchFailed"
            : "child.searchIncomplete",
        )}
      </span>
    );
  } else if (results && results.length > 0) {
    status = (
      <span className="text-slate-700">
        {t("child.found", { count: results.length })}
      </span>
    );
  } else if (results) {
    status = <span className="text-slate-700">{t("child.notFound")}</span>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">{t("child.searchIntro")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id={inputId}
          label={t("child.searchName")}
          hint={t("child.searchNameHint")}
          required
          error={errorCode ? t(`errors.${errorCode}`) : null}
        >
          {(aria) => (
            <Input
              {...aria}
              autoComplete="off"
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={onEnter}
            />
          )}
        </Field>
        <Field
          id={`${fieldId(base)}-searchDob`}
          label={t("child.dateOfBirth")}
          required
        >
          {(aria) => (
            <Input
              {...aria}
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              onKeyDown={onEnter}
            />
          )}
        </Field>
      </div>
      <Button variant="secondary" onClick={search} disabled={pending}>
        <Search aria-hidden="true" className="size-4" />
        {t("child.find")}
      </Button>
      <p aria-live="polite" className="min-h-5 text-sm">
        {status}
      </p>
      {!pending && results && results.length > 0 ? (
        <ul className="grid gap-2">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border-2 border-slate-200 bg-white p-3 text-left transition hover:border-brand-700 hover:bg-brand-50 motion-reduce:transition-none"
                onClick={() => {
                  setPickedCohort(r.cohort);
                  onChange({ existingUserId: r.id, name: r.name });
                }}
              >
                <span className="flex flex-col">
                  <span className="font-semibold">{r.name}</span>
                  {r.cohort ? (
                    <span className="text-sm text-slate-600">{r.cohort}</span>
                  ) : null}
                </span>
                <span className="text-sm font-semibold text-brand-700">
                  {t("child.select")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {!pending && results && results.length === 0 ? (
        <Button
          variant="ghost"
          onClick={() =>
            onChange({
              mode: "new",
              dateOfBirth: value.dateOfBirth || dob,
            })
          }
        >
          <UserPlus aria-hidden="true" className="size-4" />
          {t("child.switchToNew")}
        </Button>
      ) : null}
      <p className="text-sm text-slate-600">{t("child.confirmNote")}</p>
    </div>
  );
}

function NewChild({
  base,
  value,
  onChange,
  errors,
  cohorts,
}: SectionArgs & { cohorts: CohortChoice[] }) {
  const t = useTranslations("verify");
  const ph = useTranslations("common.names.placeholders");
  const preview = useStudentPreview()(value.cohortNumber, value.leftYear);
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{t("child.newIntro")}</p>
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-slate-800">
          {t("child.nameRomaji")}
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput
            path={`${base}.lastNameRomaji`}
            label={t("fields.lastNameRomaji")}
            required
            lang="en"
            autoComplete="off"
            maxLength={50}
            placeholder={ph("lastNameRomaji")}
            value={value.lastNameRomaji}
            onChange={(v) => onChange({ lastNameRomaji: v })}
            errors={errors}
          />
          <TextInput
            path={`${base}.firstNameRomaji`}
            label={t("fields.firstNameRomaji")}
            required
            lang="en"
            autoComplete="off"
            maxLength={50}
            placeholder={ph("firstNameRomaji")}
            value={value.firstNameRomaji}
            onChange={(v) => onChange({ firstNameRomaji: v })}
            errors={errors}
          />
        </div>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-slate-800">
          {t("child.nameKanji")}
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput
            path={`${base}.lastNameKanji`}
            label={t("fields.lastNameKanji")}
            lang="ja"
            autoComplete="off"
            maxLength={50}
            placeholder={ph("lastNameKanji")}
            value={value.lastNameKanji}
            onChange={(v) => onChange({ lastNameKanji: v })}
            errors={errors}
          />
          <TextInput
            path={`${base}.firstNameKanji`}
            label={t("fields.firstNameKanji")}
            lang="ja"
            autoComplete="off"
            maxLength={50}
            placeholder={ph("firstNameKanji")}
            value={value.firstNameKanji}
            onChange={(v) => onChange({ firstNameKanji: v })}
            errors={errors}
          />
          <TextInput
            path={`${base}.lastNameKana`}
            label={t("fields.lastNameKana")}
            required={Boolean(value.lastNameKanji.trim())}
            lang="ja"
            autoComplete="off"
            maxLength={50}
            placeholder={t("placeholders.lastNameKana")}
            value={value.lastNameKana}
            onChange={(v) => onChange({ lastNameKana: v })}
            errors={errors}
          />
          <TextInput
            path={`${base}.firstNameKana`}
            label={t("fields.firstNameKana")}
            required={Boolean(value.firstNameKanji.trim())}
            lang="ja"
            autoComplete="off"
            maxLength={50}
            placeholder={t("placeholders.firstNameKana")}
            value={value.firstNameKana}
            onChange={(v) => onChange({ firstNameKana: v })}
            errors={errors}
          />
        </div>
      </fieldset>
      <TextInput
        path={`${base}.dateOfBirth`}
        label={t("child.dateOfBirth")}
        type="date"
        required
        value={value.dateOfBirth}
        onChange={(v) => onChange({ dateOfBirth: v })}
        errors={errors}
      />
      <CohortPicker
        path={`${base}.cohortNumber`}
        value={value.cohortNumber}
        onChange={(v) => onChange({ cohortNumber: v })}
        errors={errors}
        cohorts={cohorts}
        defaultFilter="current"
        required
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <YearInput
          path={`${base}.joinedYear`}
          label={t("child.joinedYear")}
          value={value.joinedYear}
          onChange={(v) => onChange({ joinedYear: v })}
          errors={errors}
        />
        <YearInput
          path={`${base}.leftYear`}
          label={t("child.leftYear")}
          hint={t("child.leftYearHint")}
          required={false}
          value={value.leftYear}
          onChange={(v) => onChange({ leftYear: v })}
          errors={errors}
        />
      </div>
      {preview ? <Preview>{preview}</Preview> : null}
      <TextInput
        path={`${base}.studentIdNo`}
        label={t("fields.studentIdNo")}
        maxLength={50}
        autoComplete="off"
        value={value.studentIdNo}
        onChange={(v) => onChange({ studentIdNo: v })}
        errors={errors}
      />
    </div>
  );
}
