"use client";

import { GraduationCap } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type FormEvent,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  checkManagedDuplicateAction,
  type SubmitVerificationState,
  submitVerificationAction,
} from "@/app/actions/verify";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { type CohortChoice, parseCohortNumber } from "@/lib/cohorts";
import { GENDERS } from "@/lib/gender";
import { composeKanji, composeRomaji } from "@/lib/names";
import {
  applicantGraduated,
  issuesToErrors,
  MEMBER_TYPES,
  type MemberType,
  STEPS,
  type Step,
  stepOfPath,
  toPayload,
  type VerifyFormState,
  verificationSchema,
} from "@/lib/verification/schema";
import { EvidenceUploader } from "./evidence-uploader";
import { type Errors, fieldId, GroupError, TextInput } from "./fields";
import { ParentSection, StudentSection, TeacherSection } from "./role-sections";

const TYPE_ICON: Record<MemberType, string> = {
  STUDENT: "🎓",
  PARENT: "👪",
  TEACHER: "🧑‍🏫",
};

function validate(state: VerifyFormState, uiLocale: "ja" | "en"): Errors {
  const r = verificationSchema({ requireKanji: uiLocale === "ja" }).safeParse(
    toPayload(state),
  );
  return r.success ? {} : issuesToErrors(r.error.issues);
}

function errorsForStep(errors: Errors, step: Step): Errors {
  return Object.fromEntries(
    Object.entries(errors).filter(([path]) => stepOfPath(path) === step),
  );
}

function focusFirstError(errors: Errors) {
  const first = Object.keys(errors)[0];
  if (!first) return;
  // Wait for the step to render before focusing.
  requestAnimationFrame(() => {
    const el =
      document.getElementById(fieldId(first)) ??
      document.getElementById(fieldId(first.split(".").slice(0, -1).join(".")));
    el?.focus();
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}

/**
 * Sign-up wizard: who you are → about you → details → review & send.
 * Each step is validated with the shared Zod schema; the server re-validates.
 */
export function VerifyForm({
  initial,
  uiLocale,
  userId,
  useBlob,
  initialVerifiedSchoolEmail,
  cohorts,
}: {
  cohorts: CohortChoice[];
  initial: VerifyFormState;
  uiLocale: "ja" | "en";
  userId: string;
  useBlob: boolean;
  initialVerifiedSchoolEmail: string | null;
}) {
  const t = useTranslations("verify");
  const tg = useTranslations("profile.photo");
  const [state, setState] = useState<VerifyFormState>(initial);
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(
    initialVerifiedSchoolEmail,
  );
  const [serverState, formAction] = useActionState<
    SubmitVerificationState,
    FormData
  >(submitVerificationAction, null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const step = STEPS[stepIndex];

  // Students: a parent may already have registered them (exact name + birth
  // date). They can still continue; the committee merges the two.
  const [registeredByParent, setRegisteredByParent] = useState(false);
  const isStudent = state.types.includes("STUDENT");
  useEffect(() => {
    if (step !== "details" || !isStudent || !state.dateOfBirth) return;
    let live = true;
    checkManagedDuplicateAction({
      lastNameRomaji: state.lastNameRomaji,
      firstNameRomaji: state.firstNameRomaji,
      lastNameKanji: state.lastNameKanji,
      firstNameKanji: state.firstNameKanji,
      dateOfBirth: state.dateOfBirth,
    })
      .then((found) => {
        if (live) setRegisteredByParent(found);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [
    step,
    isStudent,
    state.lastNameRomaji,
    state.firstNameRomaji,
    state.lastNameKanji,
    state.firstNameKanji,
    state.dateOfBirth,
  ]);

  // Server-side validation errors: show them on the step they belong to.
  useEffect(() => {
    if (!serverState?.errors) return;
    const errs = serverState.errors;
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) {
      setStepIndex(STEPS.indexOf(stepOfPath(first)));
      focusFirstError(errs);
    }
  }, [serverState]);

  function set<K extends keyof VerifyFormState>(
    key: K,
    value: VerifyFormState[K],
  ) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function toggleType(type: MemberType) {
    setState((s) => ({
      ...s,
      types: s.types.includes(type)
        ? s.types.filter((x) => x !== type)
        : [...s.types, type],
    }));
  }

  function goTo(index: number) {
    setErrors({});
    setStepIndex(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
    requestAnimationFrame(() =>
      headingRef.current?.focus({ preventScroll: true }),
    );
  }

  function next() {
    const errs = errorsForStep(validate(state, uiLocale), step);
    setErrors(errs);
    if (Object.keys(errs).length) {
      focusFirstError(errs);
      return;
    }
    goTo(stepIndex + 1);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    if (step !== "review") {
      e.preventDefault();
      next();
      return;
    }
    const errs = validate(state, uiLocale);
    if (Object.keys(errs).length) {
      e.preventDefault();
      setErrors(errs);
      const first = Object.keys(errs)[0];
      setStepIndex(STEPS.indexOf(stepOfPath(first)));
      focusFirstError(errs);
    }
  }

  const errorCount = Object.keys(errors).length;
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  // 卒業証書: asked of graduates (worked out from the 学年 and leave year).
  const isGraduate =
    state.types.includes("STUDENT") &&
    applicantGraduated(
      parseCohortNumber(state.student.cohortNumber) ?? null,
      state.student.leftYear ? Number(state.student.leftYear) : null,
    );
  const diplomaItems = state.evidence.filter((e) => e.kind === "DIPLOMA");
  const otherItems = state.evidence.filter((e) => e.kind !== "DIPLOMA");

  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className="space-y-6"
    >
      <input
        type="hidden"
        name="payload"
        value={JSON.stringify(toPayload(state))}
      />
      <input type="hidden" name="uiLocale" value={uiLocale} />

      {/* Progress */}
      <nav aria-label={t("progressLabel")} className="space-y-2">
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-brand-700 transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
        <ol className="grid grid-cols-4 gap-1 text-center text-xs sm:text-sm">
          {STEPS.map((s, i) => (
            <li
              key={s}
              aria-current={i === stepIndex ? "step" : undefined}
              className={
                i <= stepIndex
                  ? "font-semibold text-brand-800"
                  : "text-slate-500"
              }
            >
              <span className="sr-only">
                {t("stepOf", { n: i + 1, total: STEPS.length })}:{" "}
              </span>
              {t(`steps.${s}`)}
            </li>
          ))}
        </ol>
      </nav>

      <div key={step} className="animate-step space-y-6">
        <header className="space-y-1">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-xl font-bold focus:outline-none"
          >
            {t(`stepTitles.${step}`)}
          </h2>
          <p className="text-slate-600">{t(`stepIntros.${step}`)}</p>
        </header>

        <div aria-live="polite">
          {errorCount ? (
            <Alert tone="error">{t("fixErrors", { count: errorCount })}</Alert>
          ) : null}
          {serverState?.message && !serverState.errors ? (
            <Alert tone="error">
              {t(`serverErrors.${serverState.message}`)}
            </Alert>
          ) : null}
        </div>

        {step === "type" ? (
          <fieldset>
            <legend className="sr-only">{t("stepTitles.type")}</legend>
            <div
              id={fieldId("types")}
              tabIndex={-1}
              className="grid gap-3 sm:grid-cols-3"
            >
              {MEMBER_TYPES.map((type, i) => {
                const on = state.types.includes(type);
                return (
                  <label
                    key={type}
                    style={{ animationDelay: `${i * 60}ms` }}
                    className={`animate-rise relative flex cursor-pointer flex-col gap-2 rounded-2xl border-2 p-4 transition motion-reduce:transition-none ${
                      on
                        ? "border-brand-700 bg-brand-50 shadow-md"
                        : "border-slate-200 bg-white hover:border-brand-100 hover:shadow-sm"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="absolute right-3 top-3 size-5"
                      checked={on}
                      onChange={() => toggleType(type)}
                    />
                    <span aria-hidden="true" className="text-3xl">
                      {TYPE_ICON[type]}
                    </span>
                    <span className="font-semibold">
                      {t(`types.${type}.title`)}
                    </span>
                    <span className="text-sm text-slate-600">
                      {t(`types.${type}.description`)}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="mt-3 text-sm text-slate-600">{t("hints.types")}</p>
            {errors.types ? (
              <p className="mt-1 text-sm text-red-700">
                {t(`errors.${errors.types}`)}
              </p>
            ) : null}
          </fieldset>
        ) : null}

        {step === "basics" ? (
          <div className="space-y-5">
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-slate-800">
                {t("fields.nameRomaji")}
              </legend>
              <p className="text-sm text-slate-600">{t("hints.nameRomaji")}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput
                  path="lastNameRomaji"
                  label={t("fields.lastNameRomaji")}
                  required
                  autoComplete="family-name"
                  lang="en"
                  value={state.lastNameRomaji}
                  onChange={(v) => set("lastNameRomaji", v)}
                  errors={errors}
                />
                <TextInput
                  path="firstNameRomaji"
                  label={t("fields.firstNameRomaji")}
                  required
                  autoComplete="given-name"
                  lang="en"
                  value={state.firstNameRomaji}
                  onChange={(v) => set("firstNameRomaji", v)}
                  errors={errors}
                />
              </div>
              <TextInput
                path="middleNameRomaji"
                label={t("fields.middleNameRomaji")}
                autoComplete="additional-name"
                lang="en"
                value={state.middleNameRomaji}
                onChange={(v) => set("middleNameRomaji", v)}
                errors={errors}
              />
            </fieldset>
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-slate-800">
                {t("fields.nameKanji")}
              </legend>
              <p className="text-sm text-slate-600">{t("hints.nameKanji")}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput
                  path="lastNameKanji"
                  label={t("fields.lastNameKanji")}
                  lang="ja"
                  value={state.lastNameKanji}
                  onChange={(v) => set("lastNameKanji", v)}
                  errors={errors}
                />
                <TextInput
                  path="firstNameKanji"
                  label={t("fields.firstNameKanji")}
                  lang="ja"
                  value={state.firstNameKanji}
                  onChange={(v) => set("firstNameKanji", v)}
                  errors={errors}
                />
                <TextInput
                  path="lastNameKana"
                  label={t("fields.lastNameKana")}
                  required={Boolean(state.lastNameKanji.trim())}
                  lang="ja"
                  placeholder={t("placeholders.lastNameKana")}
                  value={state.lastNameKana}
                  onChange={(v) => set("lastNameKana", v)}
                  errors={errors}
                />
                <TextInput
                  path="firstNameKana"
                  label={t("fields.firstNameKana")}
                  required={Boolean(state.firstNameKanji.trim())}
                  lang="ja"
                  placeholder={t("placeholders.firstNameKana")}
                  value={state.firstNameKana}
                  onChange={(v) => set("firstNameKana", v)}
                  errors={errors}
                />
              </div>
            </fieldset>
            <TextInput
              path="nameAtAis"
              label={t("fields.nameAtAis")}
              hint={t("hints.nameAtAis")}
              value={state.nameAtAis}
              onChange={(v) => set("nameAtAis", v)}
              errors={errors}
            />
            <TextInput
              path="dateOfBirth"
              type="date"
              label={t("fields.dateOfBirth")}
              hint={t("hints.dateOfBirth")}
              required
              autoComplete="bday"
              value={state.dateOfBirth}
              onChange={(v) => set("dateOfBirth", v)}
              errors={errors}
            />
            <Field
              id={fieldId("gender")}
              label={t("fields.gender")}
              hint={t("hints.gender")}
              required
              error={errors.gender ? t(`errors.${errors.gender}`) : null}
            >
              {(aria) => (
                <Select
                  {...aria}
                  value={state.gender}
                  onChange={(e) => set("gender", e.target.value)}
                >
                  <option value="">{t("choose")}</option>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {tg(`genders.${g}`)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field
              id={fieldId("locale")}
              label={t("fields.locale")}
              hint={t("hints.locale")}
              required
            >
              {(aria) => (
                <Select
                  {...aria}
                  value={state.locale}
                  onChange={(e) =>
                    set("locale", e.target.value === "en" ? "en" : "ja")
                  }
                >
                  <option value="ja">日本語</option>
                  <option value="en">English</option>
                </Select>
              )}
            </Field>
          </div>
        ) : null}

        {step === "details" ? (
          <div className="space-y-6">
            {state.types.includes("STUDENT") && registeredByParent ? (
              <Alert tone="warning">
                <span className="font-semibold">
                  {t("parentRegistered.title")}
                </span>{" "}
                {t("parentRegistered.body")}
              </Alert>
            ) : null}
            {state.types.includes("STUDENT") ? (
              <StudentSection
                value={state.student}
                onChange={(v) => set("student", v)}
                errors={errors}
                cohorts={cohorts}
              />
            ) : null}
            {state.types.includes("PARENT") ? (
              <ParentSection
                value={state.parent}
                onChange={(v) => set("parent", v)}
                errors={errors}
                cohorts={cohorts}
              />
            ) : null}
            {state.types.includes("TEACHER") ? (
              <TeacherSection
                value={state.teacher}
                onChange={(v) => set("teacher", v)}
                errors={errors}
                verifiedEmail={verifiedEmail}
                onVerified={setVerifiedEmail}
              />
            ) : null}
            {["student", "parent", "teacher"].map((p) => (
              <GroupError key={p} errors={errors} path={p} />
            ))}
          </div>
        ) : null}

        {step === "review" ? (
          <div className="space-y-6">
            <section
              aria-labelledby="review-heading"
              className="animate-rise space-y-3 rounded-2xl bg-slate-50 p-4 text-sm"
            >
              <h3 id="review-heading" className="font-semibold">
                {t("review.title")}
              </h3>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                <dt className="text-slate-600">{t("fields.nameRomaji")}</dt>
                <dd>{composeRomaji(state)}</dd>
                {composeKanji(state) ? (
                  <>
                    <dt className="text-slate-600">{t("fields.nameKanji")}</dt>
                    <dd>{composeKanji(state)}</dd>
                  </>
                ) : null}
                <dt className="text-slate-600">{t("fields.dateOfBirth")}</dt>
                <dd>{state.dateOfBirth}</dd>
                <dt className="text-slate-600">{t("fields.gender")}</dt>
                <dd>{state.gender ? tg(`genders.${state.gender}`) : "—"}</dd>
                <dt className="text-slate-600">{t("review.types")}</dt>
                <dd>
                  {state.types.map((x) => t(`types.${x}.title`)).join("・")}
                </dd>
                {state.types.includes("STUDENT") ? (
                  <>
                    <dt className="text-slate-600">{t("fields.cohort")}</dt>
                    <dd>
                      {
                        cohorts.find(
                          (c) => c.value === state.student.cohortNumber,
                        )?.label
                      }
                    </dd>
                  </>
                ) : null}
                {state.types.includes("PARENT") ? (
                  <>
                    <dt className="text-slate-600">{t("review.children")}</dt>
                    <dd>
                      {state.parent.children.map((c) => c.name).join("、")}
                    </dd>
                  </>
                ) : null}
              </dl>
              <Button variant="ghost" onClick={() => goTo(0)}>
                {t("review.edit")}
              </Button>
            </section>

            {isGraduate ? (
              <section
                aria-labelledby="diploma-title"
                className="space-y-3 rounded-2xl border-2 border-brand-200 bg-white p-4"
              >
                <h3
                  id="diploma-title"
                  className="flex items-center gap-2 font-semibold"
                >
                  <GraduationCap
                    aria-hidden="true"
                    className="size-5 text-brand-700"
                  />
                  {t("diploma.title")}
                  {state.diplomaUnavailable ? null : (
                    <span className="text-red-700" aria-hidden="true">
                      *
                    </span>
                  )}
                </h3>
                <p className="text-sm text-slate-600">{t("diploma.intro")}</p>
                {state.diplomaUnavailable ? null : (
                  <EvidenceUploader
                    userId={userId}
                    useBlob={useBlob}
                    kind="DIPLOMA"
                    max={1}
                    label={t("diploma.label")}
                    hint={t("diploma.hint")}
                    items={diplomaItems}
                    onChange={(items) =>
                      set("evidence", [...otherItems, ...items])
                    }
                    error={errors.diploma ?? errors.evidence}
                  />
                )}
                {errors.diploma ? (
                  <p id="diploma-error" className="text-sm text-red-700">
                    {t(`errors.${errors.diploma}`)}
                  </p>
                ) : null}
                <label className="flex min-h-11 items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-5 shrink-0"
                    checked={state.diplomaUnavailable}
                    onChange={(e) =>
                      set("diplomaUnavailable", e.currentTarget.checked)
                    }
                  />
                  <span>
                    {t("diploma.unavailable")}
                    <span className="block text-slate-500">
                      {t("diploma.unavailableHint")}
                    </span>
                  </span>
                </label>
              </section>
            ) : null}

            <details
              className="rounded-2xl border border-slate-200 bg-white p-4"
              open={
                otherItems.length > 0 ||
                (isGraduate && state.diplomaUnavailable)
              }
            >
              <summary className="cursor-pointer font-medium text-brand-700">
                {t("review.addDocuments")}
              </summary>
              <div className="mt-3">
                <EvidenceUploader
                  userId={userId}
                  useBlob={useBlob}
                  items={otherItems}
                  onChange={(items) =>
                    set("evidence", [...diplomaItems, ...items])
                  }
                  error={errors.evidence}
                />
              </div>
            </details>
            <p className="text-sm text-slate-600">{t("review.note")}</p>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
        {stepIndex > 0 ? (
          <Button variant="secondary" onClick={() => goTo(stepIndex - 1)}>
            {t("back")}
          </Button>
        ) : (
          <span />
        )}
        {step === "review" ? (
          <SubmitButton pendingText={t("submitting")}>
            {t("submit")}
          </SubmitButton>
        ) : (
          <Button onClick={next}>{t("next")}</Button>
        )}
      </div>
    </form>
  );
}
