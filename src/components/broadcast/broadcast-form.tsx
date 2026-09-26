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

type AudienceKind = "ALL" | "ROLES" | "COHORT";

/**
 * Compose → confirm (recipient and LINE counts) → sent. Inputs are
 * controlled so values survive the preview step.
 */
export function BroadcastForm({
  canAny,
  leaderCohorts,
}: {
  /** admin or teacher manager: any audience */
  canAny: boolean;
  /** student leader: own class years */
  leaderCohorts: number[];
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
  const [cohortYear, setCohortYear] = useState(String(leaderCohorts[0] ?? ""));
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const step = state?.step ?? "compose";
  const err = (f: "title" | "body" | "audience" | "cohortYear") => {
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
      <input type="hidden" name="cohortYear" value={cohortYear} />
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
                className="flex min-h-11 items-center gap-2 text-sm"
              >
                <input
                  type="radio"
                  checked={audience === k}
                  onChange={() => setAudience(k)}
                />
                {t(`audience.${k}`)}
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
          canAny ? (
            <Field
              id="b-cohort"
              label={t("audience.cohortYear")}
              hint={t("audience.cohortHint")}
              error={err("cohortYear")}
            >
              {(a) => (
                <Input
                  {...a}
                  inputMode="numeric"
                  maxLength={4}
                  value={cohortYear}
                  onChange={(e) => setCohortYear(e.target.value)}
                  className="max-w-40"
                />
              )}
            </Field>
          ) : (
            <Field id="b-cohort" label={t("audience.cohortYear")}>
              {(a) => (
                <Select
                  {...a}
                  value={cohortYear}
                  onChange={(e) => setCohortYear(e.target.value)}
                  className="max-w-60"
                >
                  {leaderCohorts.map((y) => (
                    <option key={y} value={String(y)}>
                      {t("audience.classOf", { year: y })}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )
        ) : null}
      </fieldset>

      <fieldset className="space-y-4" disabled={locked}>
        <Field id="b-title" label={t("title")} required error={err("title")}>
          {(a) => (
            <Input
              {...a}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
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
            <Textarea
              {...a}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              maxLength={2000}
            />
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
