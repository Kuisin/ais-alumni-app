"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import {
  type BroadcastFormState,
  broadcastAction,
} from "@/app/actions/broadcasts";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { RoleKey } from "@/generated/prisma/enums";
import type { CohortOption } from "@/lib/cohorts";

type AudienceKind = "ALL" | "ROLES" | "COHORT";

const TITLE_MAX = 100;
const BODY_MAX = 2000;

/**
 * Compose → confirm (recipient and LINE counts) → sent. Inputs are
 * controlled so values survive the preview step.
 */
export function BroadcastForm({
  canAny,
  cohorts,
}: {
  /** admin or teacher manager: any audience */
  canAny: boolean;
  /** 学年 the sender may target: all for canAny, else the leader's own */
  cohorts: CohortOption[];
}) {
  const t = useTranslations("broadcast");
  const tr = useTranslations("roles");
  const [state, action] = useActionState<BroadcastFormState, FormData>(
    broadcastAction,
    null,
  );
  const [audience, setAudience] = useState<AudienceKind>(
    canAny ? "ALL" : "COHORT",
  );
  const [roles, setRoles] = useState<RoleKey[]>([]);
  const [cohortId, setCohortId] = useState(
    canAny ? "" : (cohorts[0]?.id ?? ""),
  );
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const step = state?.step ?? "compose";
  const err = (f: "title" | "body" | "audience" | "cohortId") => {
    const code = state?.fieldErrors?.[f];
    return code ? t(`fieldErrors.${code}`) : null;
  };
  const locked = step !== "compose";

  if (step === "sent" && state?.preview) {
    return (
      <div className="space-y-4">
        <Alert tone="success">{t("sentSummary", state.preview)}</Alert>
        <Button
          variant="secondary"
          onClick={() => {
            setTitle("");
            setBody("");
            window.location.reload();
          }}
        >
          {t("sendAnother")}
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="audience" value={audience} />
      {roles.map((r) => (
        <input key={r} type="hidden" name="roles" value={r} />
      ))}
      <input type="hidden" name="cohortId" value={cohortId} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="body" value={body} />

      <fieldset className="space-y-3" disabled={locked}>
        <legend className="text-sm font-semibold text-slate-800">
          {t("audience.label")}
        </legend>
        {canAny ? (
          <div className="space-y-2">
            {(["ALL", "ROLES", "COHORT"] as const).map((k) => (
              <label
                key={k}
                className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-700 ${
                  audience === k
                    ? "border-brand-700 bg-brand-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="audience-choice"
                  checked={audience === k}
                  onChange={() => setAudience(k)}
                  aria-describedby={`b-aud-${k}-desc`}
                  className="mt-0.5 size-4 shrink-0"
                />
                <span className="min-w-0">
                  <span className="block font-medium text-slate-900">
                    {t(`audience.${k}`)}
                  </span>
                  <span
                    id={`b-aud-${k}-desc`}
                    className="block text-xs text-slate-600"
                  >
                    {t(`audience.desc.${k}`)}
                  </span>
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-700">{t("audience.leaderOnly")}</p>
        )}
        {audience === "ROLES" ? (
          <div className="grid gap-1 pl-6 sm:grid-cols-2">
            {Object.values(RoleKey).map((r) => (
              <label
                key={r}
                className="flex min-h-11 items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={roles.includes(r)}
                  onChange={(e) =>
                    setRoles((prev) =>
                      e.target.checked
                        ? [...prev, r]
                        : prev.filter((x) => x !== r),
                    )
                  }
                />
                {tr(`role.${r}`)}
              </label>
            ))}
            {err("audience") ? (
              <p className="text-sm text-red-700">{err("audience")}</p>
            ) : null}
          </div>
        ) : null}
        {audience === "COHORT" ? (
          <Field
            id="b-cohort"
            label={t("audience.cohort")}
            hint={t("audience.cohortHint")}
            error={err("cohortId")}
          >
            {(a) => (
              <Select
                {...a}
                value={cohortId}
                onChange={(e) => setCohortId(e.target.value)}
                className="max-w-md"
              >
                {canAny ? (
                  <option value="">{t("audience.chooseCohort")}</option>
                ) : null}
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        ) : null}
      </fieldset>

      <fieldset className="space-y-4" disabled={locked}>
        <Field id="b-title" label={t("title")} required error={err("title")}>
          {(a) => (
            <>
              <Input
                {...a}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={TITLE_MAX}
              />
              <p
                aria-hidden="true"
                className="mt-1 text-right text-xs text-slate-500 tabular-nums"
              >
                {t("charCount", { count: title.length, max: TITLE_MAX })}
              </p>
            </>
          )}
        </Field>
        <Field
          id="b-body"
          label={t("body")}
          hint={t("bodyHint")}
          required
          error={err("body")}
        >
          {(a) => (
            <>
              <Textarea
                {...a}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                maxLength={BODY_MAX}
              />
              <p
                aria-hidden="true"
                className="mt-1 text-right text-xs text-slate-500 tabular-nums"
              >
                {t("charCount", { count: body.length, max: BODY_MAX })}
              </p>
            </>
          )}
        </Field>
      </fieldset>

      <div aria-live="polite" className="space-y-3">
        {state?.message && step === "compose" ? (
          <Alert tone="error">{t(state.message)}</Alert>
        ) : null}
        {step === "confirm" && state?.preview ? (
          <Alert tone="warning">{t("confirmSummary", state.preview)}</Alert>
        ) : null}
      </div>

      {step === "confirm" ? (
        <div className="flex flex-wrap gap-2">
          <SubmitButton name="intent" value="send" pendingText={t("sending")}>
            {t("send", { count: state?.preview?.recipients ?? 0 })}
          </SubmitButton>
          <SubmitButton name="intent" value="edit" variant="secondary">
            {t("edit")}
          </SubmitButton>
        </div>
      ) : (
        <SubmitButton name="intent" value="preview" pendingText={t("checking")}>
          {t("preview")}
        </SubmitButton>
      )}
    </form>
  );
}
