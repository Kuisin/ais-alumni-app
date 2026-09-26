"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import {
  type AdminMemberFormState,
  removeMemberRoleAction,
  saveMemberRoleAction,
} from "@/app/actions/admin-members";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Division,
  LifeStage,
  RoleKey,
  TeacherStatus,
} from "@/generated/prisma/enums";
import type { CohortChoice } from "@/lib/cohorts";
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

/** K (0) through grade 12 */
const GRADES = Array.from({ length: 13 }, (_, i) => i);

const s = (v: number | string | null | undefined) =>
  v === null || v === undefined ? "" : String(v);

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
  const id = (k: string) => `${idPrefix}-${k}`;
  // 学年 (student roles) and the member's own years at AIS (kept separate).
  const cohortField = (
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
  );
  const yearsFields = (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id={id("yearsFrom")} label={t("yearsFromAny")}>
        {(a) => (
          <Input
            {...a}
            name="yearsFrom"
            inputMode="numeric"
            defaultValue={s(values?.yearsFrom)}
          />
        )}
      </Field>
      <Field id={id("yearsTo")} label={t("yearsToAny")}>
        {(a) => (
          <Input
            {...a}
            name="yearsTo"
            inputMode="numeric"
            defaultValue={s(values?.yearsTo)}
          />
        )}
      </Field>
    </div>
  );

  if (role === RoleKey.TEACHER) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field
            id={id("teacherStatus")}
            label={t("teacherStatus")}
            hint={t("teacherStatusHint")}
          >
            {(a) => (
              <Select
                {...a}
                name="teacherStatus"
                defaultValue={values?.teacherStatus ?? TeacherStatus.CURRENT}
              >
                {Object.values(TeacherStatus).map((st) => (
                  <option key={st} value={st}>
                    {tr(`teacherStatus.${st}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field id={id("yearsFrom")} label={t("yearsFrom")}>
          {(a) => (
            <Input
              {...a}
              name="yearsFrom"
              inputMode="numeric"
              defaultValue={s(values?.yearsFrom)}
            />
          )}
        </Field>
        <Field id={id("yearsTo")} label={t("yearsTo")} hint={t("yearsToHint")}>
          {(a) => (
            <Input
              {...a}
              name="yearsTo"
              inputMode="numeric"
              defaultValue={s(values?.yearsTo)}
            />
          )}
        </Field>
        <Field id={id("subjects")} label={t("subjects")}>
          {(a) => (
            <Input {...a} name="subjects" defaultValue={s(values?.subjects)} />
          )}
        </Field>
        <Field
          id={id("schoolEmail")}
          label={t("schoolEmail")}
          hint={
            values?.schoolEmail
              ? values.schoolEmailVerified
                ? t("verified")
                : t("unverified")
              : undefined
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
    );
  }
  if (role === RoleKey.CURRENT_STUDENT) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">{cohortField}</div>
        <Field id={id("currentGrade")} label={t("currentGrade")}>
          {(a) => (
            <Select
              {...a}
              name="currentGrade"
              defaultValue={s(values?.currentGrade)}
            >
              <option value="">{t("unknown")}</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {tr("grade", { grade: g })}
                </option>
              ))}
            </Select>
          )}
        </Field>
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
    );
  }
  if (role === RoleKey.FORMER_STUDENT) {
    return (
      <div className="space-y-4">
        {cohortField}
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-semibold text-slate-700">
            {t("aisRecord")}
          </legend>
          {/* One pair of years: joined, and graduated / left. */}
          <Field id={id("yearsFrom")} label={t("yearsFromAny")}>
            {(a) => (
              <Input
                {...a}
                name="yearsFrom"
                inputMode="numeric"
                defaultValue={s(values?.yearsFrom)}
              />
            )}
          </Field>
          <Field
            id={id("graduationOrLeaveYear")}
            label={t("graduationOrLeaveYear")}
          >
            {(a) => (
              <Input
                {...a}
                name="graduationOrLeaveYear"
                inputMode="numeric"
                defaultValue={s(values?.graduationOrLeaveYear)}
              />
            )}
          </Field>
          <Field id={id("lastDivision")} label={t("lastDivision")}>
            {(a) => (
              <Select
                {...a}
                name="lastDivision"
                defaultValue={s(values?.lastDivision)}
              >
                <option value="">{t("unknown")}</option>
                {Object.values(Division).map((d) => (
                  <option key={d} value={d}>
                    {tr(`division.${d}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id={id("didGraduate")} label={t("didGraduate")}>
            {(a) => (
              <Select
                {...a}
                name="didGraduate"
                defaultValue={
                  values?.didGraduate === null || !values
                    ? ""
                    : values.didGraduate
                      ? "yes"
                      : "no"
                }
              >
                <option value="">{t("unknown")}</option>
                <option value="yes">{t("didGraduateYes")}</option>
                <option value="no">{t("didGraduateNo")}</option>
              </Select>
            )}
          </Field>
        </fieldset>
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-semibold text-slate-700">
            {t("currentStatus")}
          </legend>
          <Field id={id("currentStage")} label={t("currentStage")}>
            {(a) => (
              <Select
                {...a}
                name="currentStage"
                defaultValue={s(values?.currentStage)}
              >
                <option value="">{t("unknown")}</option>
                {Object.values(LifeStage).map((st) => (
                  <option key={st} value={st}>
                    {tr(`stage.${st}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id={id("currentStageDetail")} label={t("currentStageDetail")}>
            {(a) => (
              <Input
                {...a}
                name="currentStageDetail"
                defaultValue={s(values?.currentStageDetail)}
              />
            )}
          </Field>
        </fieldset>
      </div>
    );
  }
  if (role === RoleKey.FORMER_PARENT) return yearsFields;
  // CURRENT_PARENT has no role-specific fields.
  return <p className="text-sm text-slate-600">{t("noFields")}</p>;
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
  const tr = useTranslations("roles");
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
                {tr(`role.${r}`)}
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
