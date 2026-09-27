"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import {
  type AdminMemberFormState,
  removeMemberRoleAction,
  saveMemberRoleAction,
} from "@/app/actions/admin-members";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { useCloseOnSave } from "@/components/ui/view-edit";
import {
  type Division,
  type LifeStage,
  RoleKey,
  TeacherStatus,
} from "@/generated/prisma/enums";
import { type CohortChoice, gradeLabel } from "@/lib/cohorts";
import { AdminFormResult } from "./form-result";

export type RoleValues = {
  role: RoleKey;
  /** 学年 as its 第N期 number */
  cohortNumber: number | null;
  teacherStatus: TeacherStatus | null;
  yearsFrom: number | null;
  yearsTo: number | null;
  subjects: string | null;
  schoolEmail: string | null;
  schoolEmailVerified: boolean;
  currentGrade: number | null;
  studentIdNo: string | null;
  lastDivision: Division | null;
  graduationOrLeaveYear: number | null;
  didGraduate: boolean | null;
  currentStage: LifeStage | null;
  currentStageDetail: string | null;
};

const s = (v: number | string | null | undefined) =>
  v === null || v === undefined ? "" : String(v);

const STUDENT_ROLES: RoleKey[] = [
  RoleKey.CURRENT_STUDENT,
  RoleKey.FORMER_STUDENT,
];

/**
 * Inputs only: whether someone is current or former, their grade and
 * graduation are computed from the 学年 and years (src/lib/school.ts) and
 * shown read-only.
 */
function RoleFields({
  role,
  values,
  idPrefix,
  cohorts,
}: {
  role: RoleKey;
  values?: RoleValues;
  idPrefix: string;
  cohorts: CohortChoice[];
}) {
  const t = useTranslations("adminMembers.roles");
  const tr = useTranslations("roles");
  const locale = useLocale() === "en" ? "en" : "ja";
  const id = (k: string) => `${idPrefix}-${k}`;

  const year = (
    name: "yearsFrom" | "yearsTo",
    label: string,
    hint?: string,
  ) => (
    <Field id={id(name)} label={label} hint={hint}>
      {(a) => (
        <Input
          {...a}
          name={name}
          inputMode="numeric"
          maxLength={4}
          defaultValue={s(values?.[name])}
        />
      )}
    </Field>
  );
  const derived = (text: string) => (
    <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
      <span className="font-medium">{t("derivedLabel")}: </span>
      {text}
    </p>
  );

  if (role === RoleKey.TEACHER) {
    return (
      <div className="space-y-4">
        {values
          ? derived(
              tr(
                `teacherStatus.${values.teacherStatus === TeacherStatus.FORMER ? "FORMER" : "CURRENT"}`,
              ),
            )
          : null}
        <div className="grid gap-4 sm:grid-cols-2">
          {year("yearsFrom", t("joinedYear"))}
          {year("yearsTo", t("leftYear"), t("leftYearTeacherHint"))}
          <Field id={id("subjects")} label={t("subjects")}>
            {(a) => (
              <Input
                {...a}
                name="subjects"
                defaultValue={s(values?.subjects)}
              />
            )}
          </Field>
          <Field
            id={id("schoolEmail")}
            label={t("schoolEmail")}
            hint={
              values?.schoolEmailVerified ? t("schoolEmailVerified") : undefined
            }
          >
            {(a) => (
              <Input
                {...a}
                type="email"
                name="schoolEmail"
                defaultValue={s(values?.schoolEmail)}
              />
            )}
          </Field>
        </div>
      </div>
    );
  }

  if (STUDENT_ROLES.includes(role)) {
    let status: string | null = null;
    if (values) {
      if (values.role === RoleKey.CURRENT_STUDENT)
        status = `${tr("role.CURRENT_STUDENT")}${values.currentGrade !== null ? ` · ${gradeLabel(values.currentGrade, locale)}` : ""}`;
      else if (values.graduationOrLeaveYear !== null)
        status = values.didGraduate
          ? t("derivedGraduated", { year: values.graduationOrLeaveYear })
          : t("derivedLeft", { year: values.graduationOrLeaveYear });
    }
    return (
      <div className="space-y-4">
        {status ? derived(status) : null}
        <Field id={id("cohortNumber")} label={t("cohort")}>
          {(a) => (
            <Select
              {...a}
              name="cohortNumber"
              defaultValue={s(values?.cohortNumber)}
            >
              <option value="">{t("unknown")}</option>
              {cohorts.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          {year("yearsFrom", t("joinedYear"))}
          {year("yearsTo", t("leftYear"), t("leftYearStudentHint"))}
          <Field id={id("studentIdNo")} label={t("studentIdNo")}>
            {(a) => (
              <Input
                {...a}
                name="studentIdNo"
                defaultValue={s(values?.studentIdNo)}
              />
            )}
          </Field>
        </div>
        {role === RoleKey.FORMER_STUDENT ? (
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-semibold text-slate-700">
              {t("currentStatus")}
            </legend>
            <p className="text-sm sm:col-span-2">
              {values?.currentStage
                ? `${tr(`stage.${values.currentStage}`)}${values.currentStageDetail ? `（${values.currentStageDetail}）` : ""}`
                : t("unknown")}
              <span className="mt-1 block text-xs text-slate-500">
                {t("stageFromHistory")}
              </span>
            </p>
          </fieldset>
        ) : null}
      </div>
    );
  }
  // Parents: current / former follows their children (family links).
  return <p className="text-sm text-slate-600">{t("parentDerived")}</p>;
}

/** Edit an existing role, with a remove button. */
export function MemberRoleForm({
  userId,
  values,
  cohorts,
}: {
  userId: string;
  values: RoleValues;
  cohorts: CohortChoice[];
}) {
  const t = useTranslations("adminMembers.roles");
  const tc = useTranslations("common");
  const [state, action] = useActionState<AdminMemberFormState, FormData>(
    saveMemberRoleAction,
    {},
  );
  useCloseOnSave(state);
  const [removeState, removeAction] = useActionState<
    AdminMemberFormState,
    FormData
  >(removeMemberRoleAction, {});
  const [confirmRemove, setConfirmRemove] = useState(false);

  return (
    <div className="space-y-3">
      <form action={action} className="space-y-4">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="role" value={values.role} />
        <RoleFields
          role={values.role}
          values={values}
          idPrefix={`r-${values.role}`}
          cohorts={cohorts}
        />
        <AdminFormResult state={state} />
        <SubmitButton variant="secondary" pendingText={tc("saving")}>
          {t("save")}
        </SubmitButton>
      </form>
      <form
        action={removeAction}
        className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3"
      >
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="role" value={values.role} />
        {confirmRemove ? (
          <>
            <span className="text-sm text-red-800">{t("removeConfirm")}</span>
            <SubmitButton variant="danger" pendingText={tc("saving")}>
              {t("remove")}
            </SubmitButton>
            <Button variant="secondary" onClick={() => setConfirmRemove(false)}>
              {tc("cancel")}
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={() => setConfirmRemove(true)}>
            {t("remove")}
          </Button>
        )}
        <div className="w-full">
          <AdminFormResult state={removeState} />
        </div>
      </form>
    </div>
  );
}

/** Add a role the member doesn't have yet. */
export function AddRoleForm({
  userId,
  available,
  cohorts,
}: {
  userId: string;
  available: RoleKey[];
  cohorts: CohortChoice[];
}) {
  const t = useTranslations("adminMembers.roles");
  const tc = useTranslations("common");
  const [role, setRole] = useState<RoleKey | "">("");
  const [state, action] = useActionState<AdminMemberFormState, FormData>(
    saveMemberRoleAction,
    {},
  );
  if (available.length === 0) return null;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="userId" value={userId} />
      <Field id="add-role" label={t("addRole")}>
        {(a) => (
          <Select
            {...a}
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as RoleKey | "")}
          >
            <option value="">—</option>
            {available.map((r) => (
              <option key={r} value={r}>
                {t(`addTypes.${r}`)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {role ? (
        <RoleFields key={role} role={role} idPrefix="add" cohorts={cohorts} />
      ) : null}
      <AdminFormResult state={state} />
      {role ? (
        <SubmitButton pendingText={tc("saving")}>{t("add")}</SubmitButton>
      ) : null}
    </form>
  );
}
