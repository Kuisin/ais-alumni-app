"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import {
  emailChangeAction,
  type SettingsFormState,
} from "@/app/actions/settings";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormResult } from "./form-result";

export function EmailChangeForm({ current }: { current: string | null }) {
  const t = useTranslations("settings.email");
  const [state, action] = useActionState<SettingsFormState, FormData>(
    emailChangeAction,
    { step: "email" },
  );
  const onCode = state.step === "code";

  return (
    <div className="space-y-3">
      <p className="text-sm">
        <span className="text-slate-600">{t("current")}: </span>
        <span className="font-medium break-all">{current ?? "—"}</span>
      </p>
      {onCode ? (
        <form action={action} className="space-y-3">
          <FormResult state={state} />
          {/* Not `required`: the resend / start-over buttons submit this form too. */}
          <Field id="email-code" label={t("codeLabel")}>
            {(aria) => (
              <Input
                {...aria}
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                className="max-w-40 tracking-widest"
              />
            )}
          </Field>
          <div className="flex flex-wrap gap-2">
            <SubmitButton
              name="intent"
              value="verify"
              pendingText={t("verifying")}
            >
              {t("verify")}
            </SubmitButton>
            <SubmitButton
              name="intent"
              value="resend"
              variant="secondary"
              pendingText={t("sending")}
            >
              {t("resend")}
            </SubmitButton>
            <SubmitButton name="intent" value="restart" variant="ghost">
              {t("startOver")}
            </SubmitButton>
          </div>
        </form>
      ) : (
        <form action={action} className="space-y-3">
          <Field id="email-new" label={t("newLabel")} required>
            {(aria) => (
              <Input
                {...aria}
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={state.ok ? "" : state.email}
                key={state.ok ? "done" : "edit"}
              />
            )}
          </Field>
          <FormResult state={state} />
          <SubmitButton name="intent" value="send" pendingText={t("sending")}>
            {t("sendCode")}
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
