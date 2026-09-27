"use client";

import { PenLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import {
  type NameRequestState,
  type NameValues,
  submitNameRequestAction,
} from "@/app/actions/name-requests";
import { NameFields } from "@/components/names/name-fields";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

/** Opens a form proposing new name parts plus a reason for the committee. */
export function NameRequestForm({ values }: { values: NameValues }) {
  const t = useTranslations("profile");
  const tv = useTranslations("verify.errors");
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<NameRequestState, FormData>(
    submitNameRequestAction,
    null,
  );
  const err = (k: string) => {
    const code =
      state?.fieldErrors?.[
        k as keyof NonNullable<NameRequestState>["fieldErrors"]
      ];
    if (!code) return null;
    return ["kanaOnly", "kanaRequired", "required", "tooLong"].includes(code)
      ? tv(code)
      : t("errors.invalid");
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
        {t("nameRequest.open")}
      </Button>
    );
  }
  return (
    <form
      action={action}
      className="animate-rise space-y-4 border-t border-slate-100 pt-4"
    >
      <p className="text-sm text-slate-600">{t("nameRequest.intro")}</p>
      <NameFields
        idPrefix="nr-"
        values={{ ...values, ...(state?.values ?? {}) }}
        error={(f) => err(f)}
      />
      <Field
        id="nr-nameAtAis"
        label={t("fields.nameAtAis")}
        hint={t("hints.nameAtAis")}
        error={err("nameAtAis")}
      >
        {(a) => (
          <Input
            {...a}
            name="nameAtAis"
            defaultValue={state?.values?.nameAtAis ?? values.nameAtAis}
            maxLength={100}
          />
        )}
      </Field>
      <Field
        id="nr-reason"
        label={t("nameRequest.reason")}
        hint={t("nameRequest.reasonHint")}
        required
        error={err("reason")}
      >
        {(a) => (
          <Textarea
            {...a}
            name="reason"
            defaultValue={state?.values?.reason ?? ""}
            maxLength={1000}
            rows={3}
          />
        )}
      </Field>
      {state && !state.ok ? (
        <p aria-live="polite" className="text-sm text-red-700">
          {t(state.message)}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <SubmitButton className="w-full sm:w-auto">
          {t("nameRequest.submit")}
        </SubmitButton>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          {t("nameRequest.close")}
        </Button>
      </div>
    </form>
  );
}
