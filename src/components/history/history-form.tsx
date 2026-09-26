"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef } from "react";
import {
  type HistoryFormState,
  saveHistoryAction,
} from "@/app/actions/history";
import { Alert } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { EducationLevel, HistoryVisibility } from "@/generated/prisma/enums";
import { OrgCombobox } from "./org-combobox";

export type HistoryValues = {
  id?: string;
  level?: EducationLevel;
  school?: { id: string; name: string };
  field?: string | null;
  company?: { id: string; name: string };
  title?: string | null;
  startYear: number | null;
  endYear: number | null;
  visibility: HistoryVisibility;
};

const s = (v: string | number | null | undefined) =>
  v === null || v === undefined ? "" : String(v);

/** Add or edit one 学歴 / 職歴 entry. */
export function HistoryForm({
  kind,
  values,
}: {
  kind: "education" | "work";
  values?: HistoryValues;
}) {
  const t = useTranslations("history");
  const [state, action] = useActionState<HistoryFormState, FormData>(
    saveHistoryAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const prefix = `${kind}-${values?.id ?? "new"}`;
  const err = (f: string) =>
    state?.fieldErrors?.[f] ? t(`fieldErrors.${state.fieldErrors[f]}`) : null;

  // Clear the "add" form after a successful save.
  useEffect(() => {
    if (state?.ok && !values?.id) formRef.current?.reset();
  }, [state, values?.id]);

  return (
    <form
      ref={formRef}
      action={action}
      className="animate-fade space-y-4"
      noValidate
    >
      <input type="hidden" name="kind" value={kind} />
      {values?.id ? <input type="hidden" name="id" value={values.id} /> : null}
      {kind === "education" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id={`${prefix}-level`}
            label={t("fields.level")}
            required
            error={err("level")}
          >
            {(a) => (
              <Select {...a} name="level" defaultValue={values?.level ?? ""}>
                <option value="">{t("choose")}</option>
                {Object.values(EducationLevel).map((l) => (
                  <option key={l} value={l}>
                    {t(`levels.${l}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <OrgCombobox
            kind="school"
            id={`${prefix}-school`}
            label={t("fields.school")}
            defaultId={values?.school?.id}
            defaultName={values?.school?.name}
            error={err("school")}
          />
          <Field
            id={`${prefix}-field`}
            label={t("fields.field")}
            error={err("field")}
          >
            {(a) => (
              <Input
                {...a}
                name="field"
                maxLength={120}
                defaultValue={s(values?.field)}
              />
            )}
          </Field>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <OrgCombobox
            kind="company"
            id={`${prefix}-company`}
            label={t("fields.company")}
            defaultId={values?.company?.id}
            defaultName={values?.company?.name}
            error={err("company")}
          />
          <Field
            id={`${prefix}-title`}
            label={t("fields.title")}
            error={err("title")}
          >
            {(a) => (
              <Input
                {...a}
                name="title"
                maxLength={120}
                defaultValue={s(values?.title)}
              />
            )}
          </Field>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id={`${prefix}-start`}
          label={t("fields.startYear")}
          error={err("startYear")}
        >
          {(a) => (
            <Input
              {...a}
              name="startYear"
              inputMode="numeric"
              maxLength={4}
              placeholder="2020"
              defaultValue={s(values?.startYear)}
            />
          )}
        </Field>
        <Field
          id={`${prefix}-end`}
          label={t("fields.endYear")}
          hint={t(`hints.endYear.${kind}`)}
          error={err("endYear")}
        >
          {(a) => (
            <Input
              {...a}
              name="endYear"
              inputMode="numeric"
              maxLength={4}
              defaultValue={s(values?.endYear)}
            />
          )}
        </Field>
      </div>
      <Field
        id={`${prefix}-visibility`}
        label={t("fields.visibility")}
        hint={t("hints.visibility")}
      >
        {(a) => (
          <Select
            {...a}
            name="visibility"
            defaultValue={
              values?.visibility ??
              (kind === "education"
                ? HistoryVisibility.MEMBERS
                : HistoryVisibility.FOLLOWERS)
            }
          >
            {Object.values(HistoryVisibility).map((v) => (
              <option key={v} value={v}>
                {t(`visibility.${v}`)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <div aria-live="polite">
        {state?.message ? (
          <Alert tone={state.ok ? "success" : "error"}>
            {t(state.message)}
          </Alert>
        ) : null}
      </div>
      <SubmitButton
        variant={values?.id ? "secondary" : "primary"}
        pendingText={t("saving")}
      >
        {values?.id ? t("save") : t("add")}
      </SubmitButton>
    </form>
  );
}
