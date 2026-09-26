"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import {
  decideRecordRequestAction,
  type RecordRequestFormState,
} from "@/app/actions/record-requests";
import { Alert } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

/** Admin: approve or reject one correction request. */
export function RecordDecisionForm({ id }: { id: string }) {
  const t = useTranslations("records.admin");
  const tr = useTranslations("records");
  const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [state, action] = useActionState<RecordRequestFormState, FormData>(
    decideRecordRequestAction,
    null,
  );
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <fieldset className="flex flex-wrap gap-4">
        <legend className="sr-only">{t("decision")}</legend>
        {(["APPROVE", "REJECT"] as const).map((d) => (
          <label key={d} className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="radio"
              name="decision"
              value={d}
              checked={decision === d}
              onChange={() => setDecision(d)}
            />
            {t(`decisions.${d}`)}
          </label>
        ))}
      </fieldset>
      <Field
        id={`note-${id}`}
        label={decision === "REJECT" ? t("noteRequired") : t("noteOptional")}
        required={decision === "REJECT"}
        error={state?.fieldErrors?.reason ? tr("fieldErrors.required") : null}
      >
        {(a) => <Textarea {...a} name="note" rows={2} maxLength={1000} />}
      </Field>
      <div aria-live="polite">
        {state?.message ? (
          <Alert tone={state.ok ? "success" : "error"}>
            {tr(state.message)}
          </Alert>
        ) : null}
      </div>
      <SubmitButton variant={decision === "REJECT" ? "danger" : "primary"}>
        {t(`submit.${decision}`)}
      </SubmitButton>
    </form>
  );
}
