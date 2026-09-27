"use client";

import { Check, Copy, Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import {
  createInviteAction,
  type InviteFormState,
} from "@/app/actions/invites";
import { CHOICE_CARD } from "@/components/events/target-roles-field";
import { Button, buttonClass } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { CohortChoice } from "@/lib/cohorts";

const TYPES = ["STUDENT", "PARENT", "TEACHER"] as const;

/** Create invitations one after another (a fresh form each time). */
export function InviteCreator({ cohorts }: { cohorts: CohortChoice[] }) {
  const [round, setRound] = useState(0);
  return (
    <InviteForm
      key={round}
      cohorts={cohorts}
      onAnother={() => setRound((r) => r + 1)}
    />
  );
}

/** Create a one-time invitation link (with who it's for) and share it. */
function InviteForm({
  cohorts,
  onAnother,
}: {
  cohorts: CohortChoice[];
  onAnother: () => void;
}) {
  const t = useTranslations("invites");
  const [state, action] = useActionState<InviteFormState, FormData>(
    createInviteAction,
    null,
  );
  const [type, setType] = useState<(typeof TYPES)[number]>("STUDENT");
  const [copied, setCopied] = useState(false);

  if (state?.ok && state.url) {
    const url = state.url;
    const text = `${t("shareText")}\n${url}`;
    return (
      <div className="space-y-3">
        <Alert tone="success">{t("created")}</Alert>
        <label htmlFor="invite-url" className="block text-sm font-medium">
          {t("link")}
        </label>
        <Input
          id="invite-url"
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
        />
        <p className="text-sm text-slate-600">{t("linkHint")}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={async () => {
              await navigator.clipboard?.writeText(url);
              setCopied(true);
            }}
          >
            {copied ? (
              <Check aria-hidden="true" className="size-4" />
            ) : (
              <Copy aria-hidden="true" className="size-4" />
            )}
            {copied ? t("copied") : t("copy")}
          </Button>
          <a
            href={`https://line.me/R/msg/text/?${encodeURIComponent(text)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass("line")}
          >
            {t("shareLine")}
          </a>
          <Button variant="ghost" onClick={onAnother}>
            <Link2 aria-hidden="true" className="size-4" />
            {t("another")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state?.error ? (
        <Alert tone="error">{t(`errors.${state.error}`)}</Alert>
      ) : null}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-800">
          {t("type")}
        </legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {TYPES.map((k) => (
            <label key={k} className={CHOICE_CARD}>
              <input
                type="radio"
                name="type"
                value={k}
                checked={type === k}
                onChange={() => setType(k)}
                className="size-5 shrink-0 accent-brand-700"
              />
              <span className="text-sm font-medium">{t(`types.${k}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {type !== "TEACHER" ? (
        <Field
          id="invite-cohort"
          label={type === "PARENT" ? t("cohortChild") : t("cohort")}
          hint={t("cohortHint")}
          required
        >
          {(a) => (
            <Select {...a} name="cohortNumber" defaultValue="">
              <option value="">—</option>
              {cohorts.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      ) : null}
      <Field id="invite-name" label={t("name")} hint={t("nameHint")}>
        {(a) => <Input {...a} name="inviteeName" maxLength={100} />}
      </Field>
      <SubmitButton className="w-full sm:w-auto">{t("create")}</SubmitButton>
    </form>
  );
}
