"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { Division, LifeStage } from "@/generated/prisma/enums";
import type { CohortOption } from "@/lib/cohorts";
import {
  emptyCurrentChild,
  emptyFormerChild,
  MAX_CHILDREN,
  type VerifyFormState,
} from "@/lib/verification/schema";
import {
  CohortPicker,
  EnumSelect,
  type Errors,
  GradeSelect,
  GroupError,
  TextInput,
  YearInput,
} from "./fields";
import { SchoolEmail } from "./school-email";

type SectionProps<K extends keyof VerifyFormState> = {
  value: VerifyFormState[K];
  onChange: (v: VerifyFormState[K]) => void;
  errors: Errors;
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-xl border border-slate-200 p-4">
      <legend className="px-1 text-base font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

function YearsRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

export function TeacherSection({
  value,
  onChange,
  errors,
  verifiedEmail,
  onVerified,
}: SectionProps<"teacher"> & {
  verifiedEmail: string | null;
  onVerified: (e: string) => void;
}) {
  const t = useTranslations("verify");
  const tr = useTranslations("roles");
  const set = (patch: Partial<VerifyFormState["teacher"]>) =>
    onChange({ ...value, ...patch });
  return (
    <Section title={tr("role.TEACHER")}>
      <YearsRow>
        <YearInput
          path="teacher.yearsFrom"
          label={t("fields.yearsFrom")}
          value={value.yearsFrom}
          onChange={(v) => set({ yearsFrom: v })}
          errors={errors}
        />
        <YearInput
          path="teacher.yearsTo"
          label={t("fields.yearsTo")}
          value={value.present ? "" : value.yearsTo}
          onChange={(v) => set({ yearsTo: v })}
          errors={errors}
          disabled={value.present}
        />
      </YearsRow>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-5"
          checked={value.present}
          onChange={(e) => set({ present: e.target.checked })}
        />
        {t("fields.present")}
      </label>
      <TextInput
        path="teacher.subjects"
        label={t("fields.subjects")}
        hint={t("hints.subjects")}
        required
        value={value.subjects}
        onChange={(v) => set({ subjects: v })}
        errors={errors}
      />
      <SchoolEmail
        value={value.schoolEmail}
        onChange={(v) => set({ schoolEmail: v })}
        verifiedEmail={verifiedEmail}
        onVerified={onVerified}
        error={errors["teacher.schoolEmail"]}
      />
    </Section>
  );
}

export function CurrentStudentSection({
  value,
  onChange,
  errors,
  cohorts,
}: SectionProps<"currentStudent"> & { cohorts: CohortOption[] }) {
  const t = useTranslations("verify");
  const tr = useTranslations("roles");
  const set = (patch: Partial<VerifyFormState["currentStudent"]>) =>
    onChange({ ...value, ...patch });
  return (
    <Section title={tr("role.CURRENT_STUDENT")}>
      <Alert tone="info">{t("hints.parentConfirmation")}</Alert>
      <CohortPicker
        path="currentStudent.cohortId"
        value={value.cohortId}
        onChange={(v) => set({ cohortId: v })}
        errors={errors}
        cohorts={cohorts}
        defaultFilter="current"
      />
      <GradeSelect
        path="currentStudent.grade"
        label={t("fields.grade")}
        value={value.grade}
        onChange={(v) => set({ grade: v })}
        errors={errors}
      />
      <TextInput
        path="currentStudent.homeroomTeacher"
        label={t("fields.homeroomTeacher")}
        required
        value={value.homeroomTeacher}
        onChange={(v) => set({ homeroomTeacher: v })}
        errors={errors}
      />
      <TextInput
        path="currentStudent.studentIdNo"
        label={t("fields.studentIdNo")}
        value={value.studentIdNo}
        onChange={(v) => set({ studentIdNo: v })}
        errors={errors}
      />
    </Section>
  );
}

function ChildrenList<T>({
  items,
  onChange,
  make,
  render,
  errors,
  path,
  addLabel,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  make: () => T;
  render: (item: T, i: number, set: (item: T) => void) => ReactNode;
  errors: Errors;
  path: string;
  addLabel: string;
}) {
  const t = useTranslations("verify");
  return (
    <div className="space-y-3">
      <GroupError errors={errors} path={path} />
      <ol className="space-y-3">
        {items.map((item, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: rows have no identity until submitted
          <li key={i} className="space-y-3 rounded-lg bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">
                {t("childN", { n: i + 1 })}
              </p>
              {items.length > 1 ? (
                <Button
                  variant="ghost"
                  onClick={() => onChange(items.filter((_, j) => j !== i))}
                  aria-label={t("removeChildN", { n: i + 1 })}
                >
                  {t("removeChild")}
                </Button>
              ) : null}
            </div>
            {render(item, i, (next) =>
              onChange(items.map((c, j) => (j === i ? next : c))),
            )}
          </li>
        ))}
      </ol>
      {items.length < MAX_CHILDREN ? (
        <Button
          variant="secondary"
          onClick={() => onChange([...items, make()])}
        >
          {addLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function CurrentParentSection({
  value,
  onChange,
  errors,
}: SectionProps<"currentParent">) {
  const t = useTranslations("verify");
  const tr = useTranslations("roles");
  return (
    <Section title={tr("role.CURRENT_PARENT")}>
      <ChildrenList
        items={value.children}
        onChange={(children) => onChange({ children })}
        make={emptyCurrentChild}
        errors={errors}
        path="currentParent.children"
        addLabel={t("addChild")}
        render={(c, i, set) => (
          <>
            <TextInput
              path={`currentParent.children.${i}.name`}
              label={t("fields.childName")}
              required
              value={c.name}
              onChange={(v) => set({ ...c, name: v })}
              errors={errors}
            />
            <GradeSelect
              path={`currentParent.children.${i}.grade`}
              label={t("fields.grade")}
              value={c.grade}
              onChange={(v) => set({ ...c, grade: v })}
              errors={errors}
            />
            <TextInput
              path={`currentParent.children.${i}.homeroomTeacher`}
              label={t("fields.homeroomTeacher")}
              value={c.homeroomTeacher}
              onChange={(v) => set({ ...c, homeroomTeacher: v })}
              errors={errors}
            />
          </>
        )}
      />
    </Section>
  );
}

export function FormerParentSection({
  value,
  onChange,
  errors,
}: SectionProps<"formerParent">) {
  const t = useTranslations("verify");
  const tr = useTranslations("roles");
  return (
    <Section title={tr("role.FORMER_PARENT")}>
      <ChildrenList
        items={value.children}
        onChange={(children) => onChange({ children })}
        make={emptyFormerChild}
        errors={errors}
        path="formerParent.children"
        addLabel={t("addChild")}
        render={(c, i, set) => (
          <>
            <TextInput
              path={`formerParent.children.${i}.name`}
              label={t("fields.childName")}
              required
              value={c.name}
              onChange={(v) => set({ ...c, name: v })}
              errors={errors}
            />
            <YearsRow>
              <YearInput
                path={`formerParent.children.${i}.yearsFrom`}
                label={t("fields.yearsFrom")}
                value={c.yearsFrom}
                onChange={(v) => set({ ...c, yearsFrom: v })}
                errors={errors}
              />
              <YearInput
                path={`formerParent.children.${i}.yearsTo`}
                label={t("fields.yearsTo")}
                value={c.yearsTo}
                onChange={(v) => set({ ...c, yearsTo: v })}
                errors={errors}
              />
            </YearsRow>
          </>
        )}
      />
    </Section>
  );
}

export function FormerStudentSection({
  value,
  onChange,
  errors,
  cohorts,
}: SectionProps<"formerStudent"> & { cohorts: CohortOption[] }) {
  const t = useTranslations("verify");
  const tr = useTranslations("roles");
  const set = (patch: Partial<VerifyFormState["formerStudent"]>) =>
    onChange({ ...value, ...patch });
  return (
    <Section title={tr("role.FORMER_STUDENT")}>
      <CohortPicker
        path="formerStudent.cohortId"
        value={value.cohortId}
        onChange={(v) => set({ cohortId: v })}
        errors={errors}
        cohorts={cohorts}
        defaultFilter="graduated"
      />
      <fieldset className="space-y-1">
        <legend className="text-sm font-medium text-slate-800">
          {t("fields.didGraduate")}
          <span className="ml-1 text-red-700" aria-hidden="true">
            *
          </span>
        </legend>
        <div className="flex flex-wrap gap-4">
          {(["yes", "no"] as const).map((v) => (
            <label key={v} className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="radio"
                name="formerStudent-didGraduate"
                className="size-5"
                checked={value.didGraduate === v}
                onChange={() => set({ didGraduate: v })}
              />
              {t(`didGraduate.${v}`)}
            </label>
          ))}
        </div>
        <GroupError errors={errors} path="formerStudent.didGraduate" />
      </fieldset>
      <YearsRow>
        <YearInput
          path="formerStudent.yearsFrom"
          label={t("fields.yearsFrom")}
          value={value.yearsFrom}
          onChange={(v) => set({ yearsFrom: v })}
          errors={errors}
        />
        <YearInput
          path="formerStudent.yearsTo"
          label={t("fields.yearsTo")}
          value={value.yearsTo}
          onChange={(v) => set({ yearsTo: v })}
          errors={errors}
        />
      </YearsRow>
      <EnumSelect
        path="formerStudent.lastDivision"
        label={t("fields.lastDivision")}
        value={value.lastDivision}
        onChange={(v) => set({ lastDivision: v })}
        errors={errors}
        options={Object.values(Division).map((d) => ({
          value: d,
          label: tr(`division.${d}`),
        }))}
      />
      <YearInput
        path="formerStudent.graduationOrLeaveYear"
        label={t("fields.graduationOrLeaveYear")}
        value={value.graduationOrLeaveYear}
        onChange={(v) => set({ graduationOrLeaveYear: v })}
        errors={errors}
      />
      <TextInput
        path="formerStudent.homeroomTeacher"
        label={t("fields.homeroomTeacherThen")}
        value={value.homeroomTeacher}
        onChange={(v) => set({ homeroomTeacher: v })}
        errors={errors}
      />
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-slate-800">
          {t("fields.classmates")}
        </legend>
        <p className="text-sm text-slate-600">{t("hints.classmates")}</p>
        <TextInput
          path="formerStudent.classmates.0"
          label={t("fields.classmateN", { n: 1 })}
          required
          value={value.classmates[0]}
          onChange={(v) => set({ classmates: [v, value.classmates[1]] })}
          errors={errors}
        />
        <TextInput
          path="formerStudent.classmates.1"
          label={t("fields.classmateN", { n: 2 })}
          value={value.classmates[1]}
          onChange={(v) => set({ classmates: [value.classmates[0], v] })}
          errors={errors}
        />
        <GroupError errors={errors} path="formerStudent.classmates" />
      </fieldset>
      <EnumSelect
        path="formerStudent.currentStage"
        label={t("fields.currentStage")}
        value={value.currentStage}
        onChange={(v) => set({ currentStage: v })}
        errors={errors}
        options={Object.values(LifeStage).map((s) => ({
          value: s,
          label: tr(`stage.${s}`),
        }))}
      />
    </Section>
  );
}
