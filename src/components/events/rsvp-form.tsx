"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { type RsvpState, rsvpAction } from "@/app/actions/events";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
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
  const [answer, setAnswer] = useState<RsvpAnswerValue | null>(
    current?.answer ?? null,
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="eventId" value={eventId} />
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-800">
          {t("rsvp.question")}
        </legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {ANSWERS.map((a) => (
            <label
              key={a}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-300 px-3 has-[:checked]:border-brand-700 has-[:checked]:bg-brand-50"
            >
              <input
                type="radio"
                name="answer"
                value={a}
                required
                checked={answer === a}
                onChange={() => setAnswer(a)}
                className="size-5"
              />
              <span className="text-sm font-medium">{t(`answer.${a}`)}</span>
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
        disabled={pending || !answer}
        aria-disabled={pending || !answer}
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
