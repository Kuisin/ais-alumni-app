"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import {
  type GenderRequestState,
  setGenderOnceAction,
  submitGenderRequestAction,
} from "@/app/actions/gender-requests";
import { Field, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { useCloseOnSave } from "@/components/ui/view-edit";
import { GENDERS } from "@/lib/gender";

/**
 * 性別: set once when missing, otherwise a request (new value + reason)
 * for the committee.
 */
export function GenderRequestForm({ current }: { current: string | null }) {
  const t = useTranslations("profile");
  const tg = useTranslations("profile.photo");
  const setOnce = current === null;
  const [state, action] = useActionState<GenderRequestState, FormData>(
    setOnce ? setGenderOnceAction : submitGenderRequestAction,
    null,
  );
  useCloseOnSave(state, state?.ok ? t(state.message) : undefined);
  const err = (k: "gender" | "reason") => {
    const code = state?.fieldErrors?.[k];
    return code ? t(`gender.fieldErrors.${code}`) : null;
  };

  return (
    <form action={action} noValidate className="space-y-4">
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
      <SubmitButton className="w-full sm:w-auto">
        {setOnce ? t("gender.setOnce") : t("gender.submit")}
      </SubmitButton>
    </form>
  );
}
