"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import {
  type CohortFormState,
  createCohortAction,
  updateCohortAction,
} from "@/app/actions/admin-cohorts";
import { Alert } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cohortNumberFor, suggestedStartYear } from "@/lib/cohorts";

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

/** New 学年: the number (第N期) follows the year the class finishes 6th grade. */
export function CohortCreateForm({ suggestedEnd }: { suggestedEnd: number }) {
  const t = useTranslations("cohorts");
  const [state, action] = useActionState<CohortFormState, FormData>(
    createCohortAction,
    null,
  );
  const [end, setEnd] = useState(String(suggestedEnd));
  const [start, setStart] = useState(String(suggestedStartYear(suggestedEnd)));
  const endNum = Number(end);
  const number = /^\d{4}$/.test(end) ? cohortNumberFor(endNum) : null;

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          id="c-end"
          label={t("fields.elementaryEndYear")}
          hint={t("hints.end")}
          required
        >
          {(a) => (
            <Input
              {...a}
              name="elementaryEndYear"
              inputMode="numeric"
              maxLength={4}
              value={end}
              onChange={(e) => {
                setEnd(e.target.value);
                if (/^\d{4}$/.test(e.target.value))
                  setStart(String(suggestedStartYear(Number(e.target.value))));
              }}
            />
          )}
        </Field>
        <Field
          id="c-start"
          label={t("fields.elementaryStartYear")}
          hint={t("hints.start")}
          required
        >
          {(a) => (
            <Input
              {...a}
              name="elementaryStartYear"
              inputMode="numeric"
              maxLength={4}
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          )}
        </Field>
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-800">
            {t("fields.number")}
          </p>
          <p className="min-h-11 py-2 text-lg font-bold text-brand-800">
            {number && number > 0 ? t("numberValue", { number }) : "—"}
          </p>
        </div>
      </div>
      <Field id="c-note" label={t("fields.note")}>
        {(a) => <Input {...a} name="note" maxLength={200} />}
      </Field>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="graduated" />
        {t("fields.graduated")}
      </label>
      <Result state={state} />
      <SubmitButton>{t("create")}</SubmitButton>
    </form>
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
