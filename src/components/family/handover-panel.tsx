"use client";

import { Send, UserRoundCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import {
  cancelHandoverAction,
  type HandoverFormState,
  startHandoverAction,
} from "@/app/actions/handover";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

/** Parent: hand a managed child account over to the child (by email). */
export function HandoverPanel({
  childId,
  pending,
}: {
  childId: string;
  pending: { email: string; expiresAt: Date } | null;
}) {
  const t = useTranslations("family.handover");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<HandoverFormState, FormData>(
    startHandoverAction,
    null,
  );
  // After sending, show the pending status instead of the form.
  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  if (pending && !open) {
    return (
      <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
        <p className="flex items-center gap-2 text-slate-700">
          <Send aria-hidden="true" className="size-4 text-brand-700" />
          {t("pending", {
            email: pending.email,
            date: new Intl.DateTimeFormat(locale, {
              dateStyle: "medium",
              timeZone: "Asia/Tokyo",
            }).format(new Date(pending.expiresAt)),
          })}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            className="px-3 text-xs"
            onClick={() => setOpen(true)}
          >
            {t("resend")}
          </Button>
          <form action={cancelHandoverAction}>
            <input type="hidden" name="childId" value={childId} />
            <SubmitButton variant="ghost" className="px-3 text-xs">
              {t("cancel")}
            </SubmitButton>
          </form>
        </div>
      </div>
    );
  }
  if (!open) {
    return (
      <Button
        variant="secondary"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        <UserRoundCheck aria-hidden="true" className="size-4" />
        {t("open")}
      </Button>
    );
  }
  return (
    <form
      action={action}
      className="animate-rise space-y-3 rounded-lg border border-slate-200 p-3"
    >
      <input type="hidden" name="childId" value={childId} />
      <p className="text-sm text-slate-600">{t("intro")}</p>
      <Field
        id={`handover-${childId}`}
        label={t("email")}
        hint={t("emailHint")}
        required
      >
        {(a) => <Input {...a} type="email" name="email" autoComplete="off" />}
      </Field>
      <div aria-live="polite">
        {state ? (
          <p
            className={
              state.ok ? "text-sm text-green-800" : "text-sm text-red-700"
            }
          >
            {t(state.message.replace(/^handover\./, ""))}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <SubmitButton className="w-full sm:w-auto">{t("send")}</SubmitButton>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          {t("close")}
        </Button>
      </div>
    </form>
  );
}
