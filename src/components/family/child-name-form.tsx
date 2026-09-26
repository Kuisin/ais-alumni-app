"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { claimChildByNameAction } from "@/app/actions/family";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

/** Parent adds a child who has no account yet; an admin confirms (§8). */
export function ChildNameForm() {
  const t = useTranslations("family");
  const [state, action] = useActionState(claimChildByNameAction, null);
  return (
    <form action={action} className="space-y-3">
      <Field
        id="childName"
        label={t("claimChild.manualLabel")}
        hint={t("claimChild.manualHint")}
        error={state && !state.ok ? t(state.message) : null}
        required
      >
        {(a) => (
          <Input {...a} name="childName" maxLength={100} autoComplete="off" />
        )}
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton variant="secondary" pendingText={t("working")}>
          {t("claimChild.manualSubmit")}
        </SubmitButton>
        <p aria-live="polite" className="text-sm text-green-800">
          {state?.ok ? t(state.message) : null}
        </p>
      </div>
    </form>
  );
}
