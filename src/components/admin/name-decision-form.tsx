"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { decideBirthDateRequestAction } from "@/app/actions/birth-date-requests";
import { decideNameRequestAction } from "@/app/actions/name-requests";

type DecisionState = { ok: boolean; message: string } | null;

import { Alert } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

/** Admin: approve (apply) or reject one name or birth date request. */
export function NameDecisionForm({
  id,
  kind = "name",
}: {
  id: string;
  kind?: "name" | "birthDate";
}) {
  const t = useTranslations("adminMembers");
  const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  // Both actions only use ok/message here.
  const decide = (
    kind === "birthDate"
      ? decideBirthDateRequestAction
      : decideNameRequestAction
  ) as (prev: DecisionState, fd: FormData) => Promise<DecisionState>;
  const [state, action] = useActionState<DecisionState, FormData>(decide, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <fieldset className="flex flex-wrap gap-4">
        <legend className="sr-only">{t("nameRequests.decision")}</legend>
        {(["APPROVE", "REJECT"] as const).map((d) => (
          <label key={d} className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="radio"
              name="decision"
              value={d}
              checked={decision === d}
              onChange={() => setDecision(d)}
            />
            {t(`nameRequests.decisions.${d}`)}
          </label>
        ))}
      </fieldset>
      <Field
        id={`${kind}-note-${id}`}
        label={
          decision === "REJECT"
            ? t("nameRequests.noteRequired")
            : t("nameRequests.noteOptional")
        }
        required={decision === "REJECT"}
      >
        {(a) => <Textarea {...a} name="note" rows={2} maxLength={1000} />}
      </Field>
      <div aria-live="polite">
        {state?.message ? (
          <Alert tone={state.ok ? "success" : "error"}>
            {kind === "birthDate" && state.message === "nameRequests.approved"
              ? t("birthDateRequests.approved")
              : t(state.message)}
          </Alert>
        ) : null}
      </div>
      <SubmitButton variant={decision === "REJECT" ? "danger" : "primary"}>
        {t(`nameRequests.submit.${decision}`)}
      </SubmitButton>
    </form>
  );
}
