"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { answerVouchAction, type VouchAnswerState } from "@/app/actions/vouch";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import type { VouchAnswer } from "@/generated/prisma/enums";

const ANSWERS: { value: VouchAnswer; variant: "primary" | "secondary" }[] = [
  { value: "YES", variant: "primary" },
  { value: "NO", variant: "secondary" },
  { value: "NOT_SURE", variant: "secondary" },
];

export function VouchAnswerForm({
  vouchId,
  current,
  closed,
}: {
  vouchId: string;
  current: VouchAnswer | null;
  closed: boolean;
}) {
  const t = useTranslations("vouch");
  const [state, action] = useActionState<VouchAnswerState, FormData>(
    answerVouchAction,
    null,
  );
  // View first once answered; the answer changes only via the button.
  const [editing, setEditing] = useState(!current);
  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="vouchId" value={vouchId} />
      {current ? (
        <p className="text-sm text-slate-700">
          {t("currentAnswer", { answer: t(`answers.${current}`) })}
        </p>
      ) : null}
      {closed ? (
        <Alert tone="info">{t("closed")}</Alert>
      ) : !editing ? (
        <Button variant="secondary" onClick={() => setEditing(true)}>
          {t("change")}
        </Button>
      ) : (
        <fieldset>
          <legend className="sr-only">{t("question")}</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {ANSWERS.map((a) => (
              <SubmitButton
                key={a.value}
                name="answer"
                value={a.value}
                variant={a.variant}
              >
                {t(`answers.${a.value}`)}
              </SubmitButton>
            ))}
          </div>
        </fieldset>
      )}
      <div aria-live="polite">
        {state?.message ? (
          <Alert tone={state.ok ? "success" : "error"}>
            {t(`messages.${state.message}`)}
          </Alert>
        ) : null}
      </div>
    </form>
  );
}
