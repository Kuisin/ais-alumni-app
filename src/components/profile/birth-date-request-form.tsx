"use client";

import { PenLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import {
  type BirthDateRequestState,
  submitBirthDateRequestAction,
} from "@/app/actions/birth-date-requests";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

/** Opens a form proposing a birth date (and why) for the committee. */
export function BirthDateRequestForm({ current }: { current: string }) {
  const t = useTranslations("profile");
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<BirthDateRequestState, FormData>(
    submitBirthDateRequestAction,
    null,
  );
  const err = (k: "dateOfBirth" | "reason") => {
    const code = state?.fieldErrors?.[k];
    return code ? t(`birthDate.fieldErrors.${code}`) : null;
  };
  const adding = !current;

  if (state?.ok) {
    return (
      <p aria-live="polite" className="text-sm text-green-800">
        {t(state.message)}
      </p>
    );
  }
  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <PenLine aria-hidden="true" className="size-4" />
        {adding ? t("birthDate.openAdd") : t("birthDate.open")}
      </Button>
    );
  }
  return (
    <form
      action={action}
      noValidate
      className="animate-rise space-y-4 border-t border-slate-100 pt-4"
    >
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
      <div className="flex flex-wrap gap-2">
        <SubmitButton className="w-full sm:w-auto">
          {t("birthDate.submit")}
        </SubmitButton>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          {t("birthDate.close")}
        </Button>
      </div>
    </form>
  );
}
