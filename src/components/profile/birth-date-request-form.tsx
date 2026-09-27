"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import {
  type BirthDateRequestState,
  submitBirthDateRequestAction,
} from "@/app/actions/birth-date-requests";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { useCloseOnSave } from "@/components/ui/view-edit";

/** A proposed birth date (and why) for the committee (inside its EditableCard). */
export function BirthDateRequestForm({ current }: { current: string }) {
  const t = useTranslations("profile");
  const [state, action] = useActionState<BirthDateRequestState, FormData>(
    submitBirthDateRequestAction,
    null,
  );
  useCloseOnSave(state, state?.ok ? t(state.message) : undefined);
  const err = (k: "dateOfBirth" | "reason") => {
    const code = state?.fieldErrors?.[k];
    return code ? t(`birthDate.fieldErrors.${code}`) : null;
  };
  const adding = !current;

  return (
    <form action={action} noValidate className="space-y-4">
      <p className="text-sm text-slate-600">{t("birthDate.intro")}</p>
      <Field
        id="bd-date"
        label={t("birthDate.field")}
        required
        error={err("dateOfBirth")}
      >
        {(a) => (
          <Input
            {...a}
            type="date"
            name="dateOfBirth"
            defaultValue={state?.values?.dateOfBirth ?? current}
            max={new Date().toISOString().slice(0, 10)}
            className="sm:max-w-xs"
          />
        )}
      </Field>
      <Field
        id="bd-reason"
        label={adding ? t("birthDate.reasonOptional") : t("birthDate.reason")}
        hint={t("birthDate.reasonHint")}
        required={!adding}
        error={err("reason")}
      >
        {(a) => (
          <Textarea
            {...a}
            name="reason"
            defaultValue={state?.values?.reason ?? ""}
            maxLength={1000}
            rows={2}
          />
        )}
      </Field>
      {state && !state.ok && !state.fieldErrors ? (
        <p aria-live="polite" className="text-sm text-red-700">
          {t(state.message)}
        </p>
      ) : null}
      <SubmitButton className="w-full sm:w-auto">
        {t("birthDate.submit")}
      </SubmitButton>
    </form>
  );
}
