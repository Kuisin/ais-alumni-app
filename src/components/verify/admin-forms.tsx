"use client";

import { Check, MessageSquareMore, X } from "lucide-react";
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
const DECISION_ICON = {
  APPROVE: Check,
  NEEDS_INFO: MessageSquareMore,
  REJECT: X,
} as const;
const DECISION_TONE = {
  APPROVE: "border-green-600 bg-green-50 text-green-900",
  NEEDS_INFO: "border-amber-500 bg-amber-50 text-amber-900",
  REJECT: "border-red-600 bg-red-50 text-red-900",
} as const;

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
      <fieldset className="space-y-2">
        <legend className="sr-only">{t("decision.label")}</legend>
        {(["APPROVE", "NEEDS_INFO", "REJECT"] as const).map((d) => {
          const Icon = DECISION_ICON[d];
          return (
            <label
              key={d}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3 transition-colors hover:bg-slate-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 ${
                decision === d ? DECISION_TONE[d] : "border-slate-200"
              }`}
            >
              <input
                type="radio"
                name="decision"
                value={d}
                className="size-5 shrink-0"
                checked={decision === d}
                onChange={() => setDecision(d)}
              />
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              {t(`decision.${d}`)}
            </label>
          );
        })}
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
        className="w-full"
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
