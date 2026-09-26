"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { type CohortChoice, elementaryEndFor, gradeLabel } from "@/lib/cohorts";
import { isCurrentTeacher, studentStatus } from "@/lib/school";
import {
  emptyChild,
  MAX_CHILDREN,
  type VerifyFormState,
} from "@/lib/verification/schema";
import {
  CohortPicker,
  type Errors,
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

function Section({
  icon,
  title,
  intro,
  children,
}: {
  icon: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="animate-rise space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <legend className="flex items-center gap-2 px-1 text-base font-semibold">
        <span aria-hidden="true" className="text-xl">
          {icon}
        </span>
        {title}
      </legend>
      <p className="text-sm text-slate-600">{intro}</p>
      {children}
    </fieldset>
  );
}

function YearsRow({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

/** "You'll be registered as …" — the status the app works out. */
function Preview({ children }: { children: ReactNode }) {
  return (
    <p
      className="animate-fade rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800"
      aria-live="polite"
    >
      <span aria-hidden="true">→ </span>
      {children}
    </p>
  );
}

const num = (v: string): number | null =>
  /^\d{4}$/.test(v.trim()) ? Number(v) : null;

/** Status preview for a 学年 number + optional leave year. */
function useStudentPreview() {
  const t = useTranslations("verify");
  const locale = useLocale() === "en" ? "en" : "ja";
  return (cohortNumber: string, leftYear: string): string | null => {
    const n = Number(cohortNumber);
    if (!Number.isInteger(n) || n < 1) return null;
    const st = studentStatus(elementaryEndFor(n), num(leftYear));
    if (st.current)
      return st.currentGrade !== null
        ? t("preview.current", { grade: gradeLabel(st.currentGrade, locale) })
        : t("preview.upcoming");
    return st.didGraduate
      ? t("preview.graduated", { year: st.graduationOrLeaveYear ?? "" })
      : t("preview.left", { year: st.graduationOrLeaveYear ?? "" });
  };
}

export function StudentSection({
  value,
  onChange,
  errors,
  cohorts,
}: SectionProps<"student"> & { cohorts: CohortChoice[] }) {
  const t = useTranslations("verify");
  const preview = useStudentPreview()(value.cohortNumber, value.leftYear);
  const set = (patch: Partial<VerifyFormState["student"]>) =>
    onChange({ ...value, ...patch });
  return (
    <Section
      icon="🎓"
      title={t("types.STUDENT.title")}
      intro={t("sections.student")}
    >
      <CohortPicker
        path="student.cohortNumber"
        value={value.cohortNumber}
        onChange={(v) => set({ cohortNumber: v })}
        errors={errors}
        cohorts={cohorts}
        defaultFilter="all"
        required
      />
      <YearsRow>
        <YearInput
          path="student.joinedYear"
          label={t("fields.joinedYear")}
          value={value.joinedYear}
          onChange={(v) => set({ joinedYear: v })}
          errors={errors}
        />
        <YearInput
          path="student.leftYear"
          label={t("fields.leftYearStudent")}
          hint={t("hints.leftYearStudent")}
          required={false}
          value={value.leftYear}
          onChange={(v) => set({ leftYear: v })}
          errors={errors}
        />
      </YearsRow>
      {preview ? <Preview>{preview}</Preview> : null}
      <details className="group rounded-lg border border-slate-200 p-3">
        <summary className="cursor-pointer text-sm font-medium text-brand-700">
          {t("sections.studentMore")}
        </summary>
        <div className="mt-3 space-y-4">
          <p className="text-sm text-slate-600">{t("hints.classmates")}</p>
          <TextInput
            path="student.classmates.0"
            label={t("fields.classmateN", { n: 1 })}
            value={value.classmates[0]}
            onChange={(v) => set({ classmates: [v, value.classmates[1]] })}
            errors={errors}
          />
          <TextInput
            path="student.classmates.1"
            label={t("fields.classmateN", { n: 2 })}
            value={value.classmates[1]}
            onChange={(v) => set({ classmates: [value.classmates[0], v] })}
            errors={errors}
          />
          <TextInput
            path="student.homeroomTeacher"
            label={t("fields.homeroomTeacher")}
            value={value.homeroomTeacher}
            onChange={(v) => set({ homeroomTeacher: v })}
            errors={errors}
          />
          <TextInput
            path="student.studentIdNo"
            label={t("fields.studentIdNo")}
            value={value.studentIdNo}
            onChange={(v) => set({ studentIdNo: v })}
            errors={errors}
          />
        </div>
      </details>
    </Section>
  );
}

export function ParentSection({
  value,
  onChange,
  errors,
  cohorts,
}: SectionProps<"parent"> & { cohorts: CohortChoice[] }) {
  const t = useTranslations("verify");
  const preview = useStudentPreview();
  const children = value.children;
  const update = (i: number, patch: Partial<(typeof children)[number]>) =>
    onChange({
      children: children.map((c, j) => (j === i ? { ...c, ...patch } : c)),
    });
  return (
    <Section
      icon="👪"
      title={t("types.PARENT.title")}
      intro={t("sections.parent")}
    >
      <ol className="space-y-4">
        {children.map((c, i) => {
          const p = preview(c.cohortNumber, c.leftYear);
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: rows have no stable id before saving
            <li
              key={i}
              className="animate-rise space-y-3 rounded-xl bg-slate-50 p-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  {t("childN", { n: i + 1 })}
                </p>
                {children.length > 1 ? (
                  <Button
                    variant="ghost"
                    onClick={() =>
                      onChange({ children: children.filter((_, j) => j !== i) })
                    }
                    aria-label={t("removeChildN", { n: i + 1 })}
                  >
                    {t("removeChild")}
                  </Button>
                ) : null}
              </div>
              <TextInput
                path={`parent.children.${i}.name`}
                label={t("fields.childName")}
                required
                value={c.name}
                onChange={(v) => update(i, { name: v })}
                errors={errors}
              />
              <CohortPicker
                path={`parent.children.${i}.cohortNumber`}
                value={c.cohortNumber}
                onChange={(v) => update(i, { cohortNumber: v })}
                errors={errors}
                cohorts={cohorts}
                defaultFilter="current"
                required
              />
              <YearInput
                path={`parent.children.${i}.leftYear`}
                label={t("fields.leftYearStudent")}
                hint={t("hints.leftYearStudent")}
                required={false}
                value={c.leftYear}
                onChange={(v) => update(i, { leftYear: v })}
                errors={errors}
              />
              {p ? <Preview>{p}</Preview> : null}
            </li>
          );
        })}
      </ol>
      <GroupError errors={errors} path="parent.children" />
      {children.length < MAX_CHILDREN ? (
        <Button
          variant="secondary"
          onClick={() => onChange({ children: [...children, emptyChild()] })}
        >
          {t("addChild")}
        </Button>
      ) : null}
    </Section>
  );
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
  const set = (patch: Partial<VerifyFormState["teacher"]>) =>
    onChange({ ...value, ...patch });
  const joined = num(value.joinedYear);
  const left = num(value.leftYear);
  return (
    <Section
      icon="🧑‍🏫"
      title={t("types.TEACHER.title")}
      intro={t("sections.teacher")}
    >
      <YearsRow>
        <YearInput
          path="teacher.joinedYear"
          label={t("fields.joinedYearTeacher")}
          value={value.joinedYear}
          onChange={(v) => set({ joinedYear: v })}
          errors={errors}
        />
        <YearInput
          path="teacher.leftYear"
          label={t("fields.leftYearTeacher")}
          hint={t("hints.leftYearTeacher")}
          required={false}
          value={value.leftYear}
          onChange={(v) => set({ leftYear: v })}
          errors={errors}
        />
      </YearsRow>
      {joined ? (
        <Preview>
          {isCurrentTeacher(left)
            ? t("preview.teacherCurrent")
            : t("preview.teacherFormer", { year: left ?? "" })}
        </Preview>
      ) : null}
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

/** Kept for layouts that show a parent-confirmation note for young students. */
export function MinorNote() {
  const t = useTranslations("verify");
  return <Alert tone="info">{t("hints.parentConfirmation")}</Alert>;
}
