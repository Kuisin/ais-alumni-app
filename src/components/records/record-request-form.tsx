"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import {
  type RecordRequestFormState,
  submitRecordRequestAction,
} from "@/app/actions/record-requests";
import { Alert } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { RoleKey } from "@/generated/prisma/enums";
import type { CohortChoice } from "@/lib/cohorts";
import type { RecordField } from "@/lib/record-requests";

const YEAR_FIELDS = new Set<RecordField>(["yearsFrom", "yearsTo"]);

/** Proposed values for one role's record, prefilled with the current ones. */
export function RecordRequestForm({
  role,
  fields,
  values,
  cohorts,
}: {
  role: RoleKey;
  fields: readonly RecordField[];
  values: Record<string, string>;
  cohorts: CohortChoice[];
}) {
  const t = useTranslations("records");
  const _tr = useTranslations("roles");
  const tc = useTranslations("common");
  const [state, action] = useActionState<RecordRequestFormState, FormData>(
    submitRecordRequestAction,
    null,
  );
  const err = (f: RecordField | "reason") => {
    const code = state?.fieldErrors?.[f];
    return code ? t(`fieldErrors.${code}`) : null;
  };
  const id = (f: string) => `${role}-${f}`;

  const control = (f: RecordField) => {
    if (YEAR_FIELDS.has(f)) {
      return (
        <Field
          key={f}
          id={id(f)}
          label={t(`fields.${f}`)}
          hint={
            f === "yearsTo"
              ? t(
                  role === "TEACHER"
                    ? "hints.teacherYearsTo"
                    : "hints.studentYearsTo",
                )
              : undefined
          }
          error={err(f)}
        >
          {(a) => (
            <Input
              {...a}
              name={f}
              defaultValue={values[f]}
              inputMode="numeric"
              maxLength={4}
              placeholder="2015"
            />
          )}
        </Field>
      );
    }
    if (f === "cohort") {
      return (
        <Field key={f} id={id(f)} label={t(`fields.${f}`)} error={err(f)}>
          {(a) => (
            <Select {...a} name={f} defaultValue={values[f]}>
              <option value="">—</option>
              {cohorts.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                  {c.graduated ? "" : ` · ${t("cohortCurrent")}`}
                </option>
              ))}
            </Select>
          )}
        </Field>
      );
    }
    return (
      <Field key={f} id={id(f)} label={t(`fields.${f}`)} error={err(f)}>
        {(a) => (
          <Input
            {...a}
            name={f}
            defaultValue={values[f]}
            maxLength={f === "subjects" ? 300 : 50}
          />
        )}
      </Field>
    );
  };

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="role" value={role} />
      <div className="grid gap-4 sm:grid-cols-2">{fields.map(control)}</div>
      <Field
        id={id("reason")}
        label={t("reason")}
        hint={t("hints.reason")}
        required
        error={err("reason")}
      >
        {(a) => <Textarea {...a} name="reason" rows={3} maxLength={1000} />}
      </Field>
      <div aria-live="polite">
        {state?.message ? (
          <Alert tone={state.ok ? "success" : "error"}>
            {t(state.message)}
          </Alert>
        ) : null}
      </div>
      <SubmitButton pendingText={tc("saving")}>{t("submit")}</SubmitButton>
    </form>
  );
}
