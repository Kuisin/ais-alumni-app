"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef } from "react";
import type { OtpFormState } from "@/app/actions/auth";
import { Alert } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

type OtpAction = (
  prev: OtpFormState,
  formData: FormData,
) => Promise<OtpFormState>;

const FIELD_ERRORS = new Set([
  "invalid_email",
  "invalid_code_format",
  "invalid",
]);

/**
 * Two-step "email → 6-digit code" form used for sign-in (landing) and for
 * confirming the email of LINE-first accounts (/app/onboarding/email). The server
 * action receives an `intent` of request | resend | verify | change.
 */
export function OtpEmailForm({
  action,
  sendLabel,
  verifyLabel,
  next,
}: {
  action: OtpAction;
  sendLabel?: string;
  verifyLabel?: string;
  /** page to return to after signing in */
  next?: string | null;
}) {
  const t = useTranslations("auth.otp");
  const [state, formAction, pending] = useActionState(action, {
    step: "email",
  });
  const initial = useRef(true);

  // After each submission, move focus to the field the user needs next
  // (keyboard / screen readers). Not on first render, to keep page focus.
  useEffect(() => {
    if (initial.current) {
      initial.current = false;
      return;
    }
    document
      .getElementById(state.step === "code" ? "otp-code" : "otp-email")
      ?.focus();
  }, [state]);

  const fieldError =
    state.error && FIELD_ERRORS.has(state.error)
      ? t(`errors.${state.error}`)
      : null;
  const formError =
    state.error && !FIELD_ERRORS.has(state.error)
      ? t(`errors.${state.error}`)
      : null;

  const status = (
    <div aria-live="polite" className="empty:hidden">
      {formError ? <Alert tone="error">{formError}</Alert> : null}
      {!formError && state.notice ? (
        <Alert tone="success">
          {t(state.notice, { email: state.email ?? "" })}
        </Alert>
      ) : null}
    </div>
  );

  if (state.step === "email") {
    return (
      <form action={formAction} className="space-y-4" key="email">
        <input type="hidden" name="intent" value="request" />
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {status}
        <Field
          id="otp-email"
          label={t("emailLabel")}
          error={fieldError}
          required
        >
          {(aria) => (
            <Input
              {...aria}
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              defaultValue={state.email ?? ""}
              placeholder="you@example.com"
            />
          )}
        </Field>
        <SubmitButton className="w-full" pendingText={t("sending")}>
          {sendLabel ?? t("sendCode")}
        </SubmitButton>
      </form>
    );
  }

  return (
    <form action={formAction} className="space-y-4" key="code">
      <input type="hidden" name="email" value={state.email ?? ""} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {status}
      <p className="text-sm text-slate-700">
        {t("enterCodeFor", { email: state.email ?? "" })}
      </p>
      <Field
        id="otp-code"
        label={t("codeLabel")}
        hint={t("codeHint")}
        error={fieldError}
        required
      >
        {(aria) => (
          <Input
            {...aria}
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]*"
            minLength={6}
            maxLength={7}
            className="text-center font-mono text-2xl tracking-[0.4em]"
          />
        )}
      </Field>
      {/* First submit button = default for Enter key. */}
      <SubmitButton
        name="intent"
        value="verify"
        className="w-full"
        pendingText={t("verifying")}
      >
        {verifyLabel ?? t("verify")}
      </SubmitButton>
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <button
          type="submit"
          name="intent"
          value="resend"
          formNoValidate
          disabled={pending}
          className="min-h-11 rounded-lg px-2 font-medium text-brand-700 underline hover:bg-brand-50 disabled:text-slate-400"
        >
          {t("resend")}
        </button>
        <button
          type="submit"
          name="intent"
          value="change"
          formNoValidate
          disabled={pending}
          className="min-h-11 rounded-lg px-2 text-slate-700 underline hover:bg-slate-100 disabled:text-slate-400"
        >
          {t("changeEmail")}
        </button>
      </div>
    </form>
  );
}
