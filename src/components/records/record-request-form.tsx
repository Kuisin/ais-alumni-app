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
import { Division, type RoleKey } from "@/generated/prisma/enums";
import type { RecordField } from "@/lib/record-requests";

const YEAR_FIELDS = new Set<RecordField>([
  "yearsFrom",
  "yearsTo",
  "graduationOrLeaveYear",
]);
const GRADES = Array.from({ length: 13 }, (_, i) => i);

/** Proposed values for one role's record, prefilled with the current ones. */
export function RecordRequestForm({
  role,
  fields,
  values,
}: {
  role: RoleKey;
  fields: readonly RecordField[];
  values: Record<string, string>;
}) {
  const t = useTranslations("records");
  const tr = useTranslations("roles");
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
            f === "yearsTo" && role === "TEACHER"
              ? t("hints.teacherYearsTo")
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
    if (f === "lastDivision") {
      return (
        <Field key={f} id={id(f)} label={t(`fields.${f}`)} error={err(f)}>
          {(a) => (
            <Select {...a} name={f} defaultValue={values[f]}>
              <option value="">—</option>
              {Object.values(Division).map((d) => (
                <option key={d} value={d}>
                  {tr(`division.${d}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      );
    }
    if (f === "didGraduate") {
      return (
        <Field key={f} id={id(f)} label={t(`fields.${f}`)} error={err(f)}>
          {(a) => (
            <Select {...a} name={f} defaultValue={values[f]}>
              <option value="">—</option>
              <option value="true">{tc("yes")}</option>
              <option value="false">{tc("no")}</option>
            </Select>
          )}
        </Field>
      );
    }
    if (f === "currentGrade") {
      return (
        <Field key={f} id={id(f)} label={t(`fields.${f}`)} error={err(f)}>
          {(a) => (
            <Select {...a} name={f} defaultValue={values[f]}>
              <option value="">—</option>
              {GRADES.map((g) => (
                <option key={g} value={String(g)}>
                  {tr("grade", { grade: String(g) })}
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
