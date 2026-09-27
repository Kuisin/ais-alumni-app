"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import {
  type PositionFormState,
  setMemberPositionAction,
} from "@/app/actions/admin-positions";
import { Button } from "@/components/ui/button";
import { Alert, Badge } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { useCloseOnSave, ViewEdit } from "@/components/ui/view-edit";
import type { PositionKey } from "@/generated/prisma/enums";
import type { CohortChoice } from "@/lib/cohorts";

/**
 * One position: its name, whether it's held and what it does; 任命する /
 * 編集 opens grant / update / remove in place (view first).
 */
export function MemberPositionControl({
  userId,
  position,
  held,
  cohortNumber,
  defaultCohortNumber,
  cohorts,
  eligible,
}: {
  userId: string;
  position: PositionKey;
  held: boolean;
  /** 学年 as its 第N期 number */
  cohortNumber: number | null;
  defaultCohortNumber: number | null;
  cohorts: CohortChoice[];
  eligible: boolean;
}) {
  const t = useTranslations("adminMembers.positions");
  const tc = useTranslations("common");
  const needsCohort = position === "STUDENT_LEADER";
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <ViewEdit
        canEdit={eligible || held}
        editLabel={held ? tc("edit") : t("grant")}
        title={
          <span className="flex flex-wrap items-center gap-2 text-base">
            {t(`names.${position}`)}
            {held ? (
              <Badge tone="green">
                {needsCohort && cohortNumber
                  ? t("heldCohort", {
                      cohort:
                        cohorts.find((c) => c.value === String(cohortNumber))
                          ?.label ?? "—",
                    })
                  : t("held")}
              </Badge>
            ) : null}
          </span>
        }
        view={
          <div className="space-y-1 text-sm">
            <p className="text-slate-600">{t(`descriptions.${position}`)}</p>
            {!eligible && !held ? (
              <p className="text-amber-800">{t(`requires.${position}`)}</p>
            ) : null}
          </div>
        }
      >
        <PositionForm
          userId={userId}
          position={position}
          held={held}
          cohortNumber={cohortNumber}
          defaultCohortNumber={defaultCohortNumber}
          cohorts={cohorts}
          eligible={eligible}
        />
      </ViewEdit>
    </div>
  );
}

function PositionForm({
  userId,
  position,
  held,
  cohortNumber,
  defaultCohortNumber,
  cohorts,
  eligible,
}: {
  userId: string;
  position: PositionKey;
  held: boolean;
  cohortNumber: number | null;
  defaultCohortNumber: number | null;
  cohorts: CohortChoice[];
  eligible: boolean;
}) {
  const t = useTranslations("adminMembers.positions");
  const [state, action] = useActionState<PositionFormState, FormData>(
    setMemberPositionAction,
    null,
  );
  useCloseOnSave(
    state,
    state?.ok && state.message ? t(state.message) : undefined,
  );
  const needsCohort = position === "STUDENT_LEADER";
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-slate-600">{t(`descriptions.${position}`)}</p>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="position" value={position} />
      {needsCohort ? (
        <Field id={`cohort-${position}`} label={t("cohort")}>
          {(a) => (
            <Select
              {...a}
              name="cohortNumber"
              defaultValue={String(cohortNumber ?? defaultCohortNumber ?? "")}
            >
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
      <div className="flex flex-wrap gap-2">
        {eligible ? (
          <SubmitButton name="grant" value="yes" variant="primary">
            {held ? t("update") : t("grant")}
          </SubmitButton>
        ) : null}
        {held ? (
          <Button
            type="submit"
            name="grant"
            value="no"
            variant="secondary"
            className="text-red-700"
            onClick={(e) => {
              if (!window.confirm(t("removeConfirm"))) e.preventDefault();
            }}
          >
            {t("remove")}
          </Button>
        ) : null}
      </div>
      <div aria-live="polite">
        {state && !state.ok && state.message ? (
          <Alert tone="error">{t(state.message)}</Alert>
        ) : null}
      </div>
    </form>
  );
}
