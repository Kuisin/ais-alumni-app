"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import {
  type CohortFormState,
  updateCohortAction,
} from "@/app/actions/admin-cohorts";
import { Alert } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { useCloseOnSave } from "@/components/ui/view-edit";

function Result({ state }: { state: CohortFormState }) {
  const t = useTranslations("cohorts");
  return (
    <div aria-live="polite">
      {state?.message ? (
        <Alert tone={state.ok ? "success" : "error"}>{t(state.message)}</Alert>
      ) : null}
    </div>
  );
}

export function CohortEditForm({
  id,
  start,
  end,
  note,
}: {
  id: string;
  start: number;
  end: number;
  note: string;
}) {
  const t = useTranslations("cohorts");
  const [state, action] = useActionState<CohortFormState, FormData>(
    updateCohortAction,
    null,
  );
  useCloseOnSave(state);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`${id}-start`} label={t("fields.elementaryStartYear")}>
          {(a) => (
            <Input
              {...a}
              name="elementaryStartYear"
              inputMode="numeric"
              maxLength={4}
              defaultValue={String(start)}
            />
          )}
        </Field>
        <Field
          id={`${id}-end`}
          label={t("fields.elementaryEndYear")}
          hint={t("hints.endChangesNumber")}
        >
          {(a) => (
            <Input
              {...a}
              name="elementaryEndYear"
              inputMode="numeric"
              maxLength={4}
              defaultValue={String(end)}
            />
          )}
        </Field>
      </div>
      <Field id={`${id}-note`} label={t("fields.note")}>
        {(a) => (
          <Input {...a} name="note" maxLength={200} defaultValue={note} />
        )}
      </Field>
      <Result state={state} />
      <SubmitButton variant="secondary">{t("save")}</SubmitButton>
    </form>
  );
}
