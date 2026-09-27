"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { type RsvpState, rsvpAction } from "@/app/actions/events";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { useCloseOnSave } from "@/components/ui/view-edit";
import { MAX_GUESTS, type RsvpAnswerValue } from "@/lib/events";
import { useFormAction } from "./use-form-action";

const ANSWERS: RsvpAnswerValue[] = ["GOING", "MAYBE", "NOT_GOING"];
const GUEST_OPTIONS = Array.from({ length: MAX_GUESTS + 1 }, (_, n) => n);

export function RsvpForm({
  eventId,
  current,
}: {
  eventId: string;
  current: { answer: RsvpAnswerValue; guests: number } | null;
}) {
  const t = useTranslations("events");
  const { state, pending, onSubmit } = useFormAction<RsvpState>(rsvpAction, {});
  useCloseOnSave(state);
  const [answer, setAnswer] = useState<RsvpAnswerValue | null>(
    current?.answer ?? null,
  );

  return (
    // noValidate: a missing answer comes back from the server as a visible
    // error rather than a browser bubble pinned to the visually-hidden radio.
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <input type="hidden" name="eventId" value={eventId} />
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-800">
          {t("rsvp.question")}
        </legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {ANSWERS.map((a) => (
            <label
              key={a}
              className="group flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 transition-colors hover:border-brand-300 has-[:checked]:border-brand-700 has-[:checked]:bg-brand-700 has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-700"
            >
              <input
                type="radio"
                name="answer"
                value={a}
                required
                checked={answer === a}
                onChange={() => setAnswer(a)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className="flex size-5 shrink-0 items-center justify-center rounded-full border border-slate-400 peer-checked:border-white peer-checked:bg-white peer-checked:text-brand-700"
              >
                {answer === a ? <Check className="size-3.5" /> : null}
              </span>
              <span className="text-sm font-semibold">{t(`answer.${a}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {answer && answer !== "NOT_GOING" ? (
        <div className="space-y-1">
          <label
            htmlFor="rsvp-guests"
            className="block text-sm font-medium text-slate-800"
          >
            {t("rsvp.guests")}
          </label>
          <Select
            id="rsvp-guests"
            name="guests"
            defaultValue={String(current?.guests ?? 0)}
            className="max-w-32"
            aria-describedby="rsvp-guests-hint"
          >
            {GUEST_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
          <p id="rsvp-guests-hint" className="text-sm text-slate-600">
            {t("rsvp.guestsHint", { max: MAX_GUESTS })}
          </p>
        </div>
      ) : null}

      <div aria-live="polite">
        {state.error ? (
          <Alert tone="error">{t(`rsvp.errors.${state.error}`)}</Alert>
        ) : null}
        {state.ok && !pending ? (
          <Alert tone="success">{t("rsvp.saved")}</Alert>
        ) : null}
      </div>

      <Button
        type="submit"
        disabled={pending}
        aria-disabled={pending}
        className="w-full sm:w-auto"
      >
        {pending
          ? t("rsvp.saving")
          : current
            ? t("rsvp.update")
            : t("rsvp.submit")}
      </Button>
    </form>
  );
}
