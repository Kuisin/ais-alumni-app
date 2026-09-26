"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import {
  type AdminActionState,
  addVoucherAction,
  decideVerificationAction,
} from "@/app/actions/admin-verify";
import { Alert } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

function Status({ state }: { state: AdminActionState }) {
  const t = useTranslations("adminVerify");
  return (
    <div aria-live="polite">
      {state?.message ? (
        <Alert tone={state.ok ? "success" : "error"}>
          {t(`messages.${state.message}`)}
        </Alert>
      ) : null}
    </div>
  );
}

type Decision = "APPROVE" | "REJECT" | "NEEDS_INFO";

/** Approve / Reject (reason required) / Needs more info (message required). */
export function DecisionForm({ requestId }: { requestId: string }) {
  const t = useTranslations("adminVerify");
  const [state, action] = useActionState<AdminActionState, FormData>(
    decideVerificationAction,
    null,
  );
  const [decision, setDecision] = useState<Decision>("APPROVE");
  const noteRequired = decision !== "APPROVE";
  const noteError = state?.errors?.note
    ? t(`errors.${state.errors.note}`)
    : null;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="requestId" value={requestId} />
      <fieldset className="space-y-1">
        <legend className="text-sm font-medium text-slate-800">
          {t("decision.label")}
        </legend>
        {(["APPROVE", "NEEDS_INFO", "REJECT"] as const).map((d) => (
          <label
            key={d}
            className="flex min-h-11 items-center gap-3 rounded-lg px-2 hover:bg-slate-50"
          >
            <input
              type="radio"
              name="decision"
              value={d}
              className="size-5"
              checked={decision === d}
              onChange={() => setDecision(d)}
            />
            {t(`decision.${d}`)}
          </label>
        ))}
      </fieldset>
      <Field
        id="decision-note"
        label={
          decision === "REJECT"
            ? t("decision.reason")
            : decision === "NEEDS_INFO"
              ? t("decision.message")
              : t("decision.noteOptional")
        }
        hint={t("decision.noteHint")}
        required={noteRequired}
        error={noteError}
      >
        {(aria) => <Textarea {...aria} name="note" maxLength={2000} />}
      </Field>
      <SubmitButton
        variant={decision === "REJECT" ? "danger" : "primary"}
        pendingText={t("saving")}
      >
        {t(`decision.submit.${decision}`)}
      </SubmitButton>
      <Status state={state} />
    </form>
  );
}

export function AddVoucherButton({
  requestId,
  voucherId,
  name,
}: {
  requestId: string;
  voucherId: string;
  name: string;
}) {
  const t = useTranslations("adminVerify");
  const [state, action] = useActionState<AdminActionState, FormData>(
    addVoucherAction,
    null,
  );
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="voucherId" value={voucherId} />
      <SubmitButton variant="secondary" pendingText={t("saving")}>
        <span aria-hidden="true">{t("vouches.add")}</span>
        <span className="sr-only">{t("vouches.addNamed", { name })}</span>
      </SubmitButton>
      <span aria-live="polite" className="text-sm">
        {state?.message ? (
          <span className={state.ok ? "text-green-800" : "text-red-700"}>
            {t(`messages.${state.message}`)}
          </span>
        ) : null}
      </span>
    </form>
  );
}
