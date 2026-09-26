"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import {
  type PositionFormState,
  setMemberPositionAction,
} from "@/app/actions/admin-positions";
import { Alert, Badge } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { PositionKey } from "@/generated/prisma/enums";
import type { CohortOption } from "@/lib/cohorts";

/** One position row: current status plus grant / update / remove. */
export function MemberPositionControl({
  userId,
  position,
  held,
  cohortId,
  defaultCohortId,
  cohorts,
  eligible,
}: {
  userId: string;
  position: PositionKey;
  held: boolean;
  cohortId: string | null;
  defaultCohortId: string | null;
  cohorts: CohortOption[];
  eligible: boolean;
}) {
  const t = useTranslations("adminMembers.positions");
  const [state, action] = useActionState<PositionFormState, FormData>(
    setMemberPositionAction,
    null,
  );
  const needsCohort = position === "STUDENT_LEADER";

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{t(`names.${position}`)}</span>
        {held ? (
          <Badge tone="green">
            {needsCohort && cohortId
              ? t("heldCohort", {
                  cohort: cohorts.find((c) => c.id === cohortId)?.label ?? "—",
                })
              : t("held")}
          </Badge>
        ) : null}
      </div>
      <p className="text-sm text-slate-600">{t(`descriptions.${position}`)}</p>
      {!eligible && !held ? (
        <p className="text-sm text-amber-800">{t(`requires.${position}`)}</p>
      ) : (
        <form action={action} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="position" value={position} />
          {needsCohort ? (
            <Field id={`cohort-${position}`} label={t("cohort")}>
              {(a) => (
                <Select
                  {...a}
                  name="cohortId"
                  defaultValue={cohortId ?? defaultCohortId ?? ""}
                >
                  <option value="">—</option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : null}
          {eligible ? (
            <SubmitButton name="grant" value="yes" variant="primary">
              {held ? t("update") : t("grant")}
            </SubmitButton>
          ) : null}
          {held ? (
            <SubmitButton name="grant" value="no" variant="secondary">
              {t("remove")}
            </SubmitButton>
          ) : null}
        </form>
      )}
      <div aria-live="polite">
        {state?.message ? (
          <Alert tone={state.ok ? "success" : "error"}>
            {t(state.message)}
          </Alert>
        ) : null}
      </div>
    </div>
  );
}
