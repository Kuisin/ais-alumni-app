"use client";

import { PenLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import {
  type GenderRequestState,
  setGenderOnceAction,
  submitGenderRequestAction,
} from "@/app/actions/gender-requests";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { GENDERS } from "@/lib/gender";

/**
 * 性別: set once when missing, otherwise a request (new value + reason)
 * for the committee.
 */
export function GenderRequestForm({ current }: { current: string | null }) {
  const t = useTranslations("profile");
  const tg = useTranslations("profile.photo");
  const setOnce = current === null;
  const [open, setOpen] = useState(setOnce);
  const [state, action] = useActionState<GenderRequestState, FormData>(
    setOnce ? setGenderOnceAction : submitGenderRequestAction,
    null,
  );
  const err = (k: "gender" | "reason") => {
    const code = state?.fieldErrors?.[k];
    return code ? t(`gender.fieldErrors.${code}`) : null;
  };

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
        {t("gender.open")}
      </Button>
    );
  }
  return (
    <form
      action={action}
      noValidate
      className="animate-rise space-y-4 border-t border-slate-100 pt-4"
    >
      {!setOnce ? (
        <p className="text-sm text-slate-600">{t("gender.intro")}</p>
      ) : null}
      <Field
        id="gender-value"
        label={t("gender.field")}
        required
        error={err("gender")}
      >
        {(a) => (
          <Select
            {...a}
            name="gender"
            defaultValue={state?.values?.gender ?? ""}
            className="sm:max-w-xs"
          >
            <option value="">{tg("genders.none")}</option>
            {GENDERS.filter((g) => g !== current).map((g) => (
              <option key={g} value={g}>
                {tg(`genders.${g}`)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {!setOnce ? (
        <Field
          id="gender-reason"
          label={t("gender.reason")}
          hint={t("gender.reasonHint")}
          required
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
      ) : null}
      {state && !state.ok && !state.fieldErrors ? (
        <p aria-live="polite" className="text-sm text-red-700">
          {t(state.message)}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <SubmitButton className="w-full sm:w-auto">
          {setOnce ? t("gender.setOnce") : t("gender.submit")}
        </SubmitButton>
        {!setOnce ? (
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("gender.close")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
