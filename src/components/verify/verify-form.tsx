"use client";

import { useTranslations } from "next-intl";
import {
  type FormEvent,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  type SubmitVerificationState,
  submitVerificationAction,
} from "@/app/actions/verify";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { RoleKey } from "@/generated/prisma/enums";
import { composeKanji, composeRomaji } from "@/lib/names";
import {
  issuesToErrors,
  ROLE_ORDER,
  STEPS,
  type Step,
  stepOfPath,
  toPayload,
  type VerifyFormState,
  verificationSchema,
} from "@/lib/verification/schema";
import { EvidenceUploader } from "./evidence-uploader";
import { type Errors, fieldId, GroupError, TextInput } from "./fields";
import {
  CurrentParentSection,
  CurrentStudentSection,
  FormerParentSection,
  FormerStudentSection,
  TeacherSection,
} from "./role-sections";

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
    el?.scrollIntoView({ block: "center" });
  });
}

/**
 * Verification form (§6, §14 screen 4): three steps on one page with
 * per-step validation using the shared Zod schema; the server re-validates.
 */
export function VerifyForm({
  initial,
  uiLocale,
  userId,
  useBlob,
  initialVerifiedSchoolEmail,
}: {
  initial: VerifyFormState;
  uiLocale: "ja" | "en";
  userId: string;
  useBlob: boolean;
  initialVerifiedSchoolEmail: string | null;
}) {
  const t = useTranslations("verify");
  const tr = useTranslations("roles");
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

  function toggleRole(role: RoleKey, on: boolean) {
    setState((s) => ({
      ...s,
      roles: on ? [...s.roles, role] : s.roles.filter((r) => r !== role),
    }));
  }

  function goTo(index: number) {
    setStepIndex(index);
    requestAnimationFrame(() => headingRef.current?.focus());
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
    if (step !== "evidence") {
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

      <nav aria-label={t("progressLabel")}>
        <ol className="grid grid-cols-3 gap-2">
          {STEPS.map((s, i) => (
            <li
              key={s}
              aria-current={i === stepIndex ? "step" : undefined}
              className={`rounded-lg border-t-4 pt-2 text-xs sm:text-sm ${
                i <= stepIndex
                  ? "border-brand-700 font-semibold text-brand-800"
                  : "border-slate-200 text-slate-500"
              }`}
            >
              <span className="sr-only">
                {t("stepOf", { n: i + 1, total: STEPS.length })}:{" "}
              </span>
              {t(`steps.${s}`)}
            </li>
          ))}
        </ol>
      </nav>

      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-lg font-semibold focus:outline-none"
      >
        {t("stepOf", { n: stepIndex + 1, total: STEPS.length })} —{" "}
        {t(`steps.${step}`)}
      </h2>

      <div aria-live="polite">
        {errorCount ? (
          <Alert tone="error">{t("fixErrors", { count: errorCount })}</Alert>
        ) : null}
        {serverState?.message && !serverState.errors ? (
          <Alert tone="error">{t(`serverErrors.${serverState.message}`)}</Alert>
        ) : null}
      </div>

      {step === "basics" ? (
        <div className="space-y-4">
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
                required={uiLocale === "ja"}
                lang="ja"
                value={state.lastNameKanji}
                onChange={(v) => set("lastNameKanji", v)}
                errors={errors}
              />
              <TextInput
                path="firstNameKanji"
                label={t("fields.firstNameKanji")}
                required={uiLocale === "ja"}
                lang="ja"
                value={state.firstNameKanji}
                onChange={(v) => set("firstNameKanji", v)}
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

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-800">
              {t("fields.roles")}
              <span className="ml-1 text-red-700" aria-hidden="true">
                *
              </span>
            </legend>
            <p className="text-sm text-slate-600">{t("hints.roles")}</p>
            <div className="space-y-1">
              {ROLE_ORDER.map((role, i) => (
                <label
                  key={role}
                  className="flex min-h-11 items-center gap-3 rounded-lg px-2 hover:bg-slate-50"
                >
                  <input
                    id={i === 0 ? fieldId("roles") : undefined}
                    type="checkbox"
                    className="size-5"
                    checked={state.roles.includes(role)}
                    onChange={(e) => toggleRole(role, e.target.checked)}
                  />
                  <span>{tr(`role.${role}`)}</span>
                </label>
              ))}
            </div>
            {errors.roles ? (
              <p className="text-sm text-red-700">
                {t(`errors.${errors.roles}`)}
              </p>
            ) : null}
          </fieldset>

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

      {step === "roles" ? (
        <div className="space-y-6">
          {ROLE_ORDER.filter((r) => state.roles.includes(r)).map((role) => {
            switch (role) {
              case "TEACHER":
                return (
                  <TeacherSection
                    key={role}
                    value={state.teacher}
                    onChange={(v) => set("teacher", v)}
                    errors={errors}
                    verifiedEmail={verifiedEmail}
                    onVerified={setVerifiedEmail}
                  />
                );
              case "CURRENT_STUDENT":
                return (
                  <CurrentStudentSection
                    key={role}
                    value={state.currentStudent}
                    onChange={(v) => set("currentStudent", v)}
                    errors={errors}
                  />
                );
              case "CURRENT_PARENT":
                return (
                  <CurrentParentSection
                    key={role}
                    value={state.currentParent}
                    onChange={(v) => set("currentParent", v)}
                    errors={errors}
                  />
                );
              case "FORMER_STUDENT":
                return (
                  <FormerStudentSection
                    key={role}
                    value={state.formerStudent}
                    onChange={(v) => set("formerStudent", v)}
                    errors={errors}
                  />
                );
              case "FORMER_PARENT":
                return (
                  <FormerParentSection
                    key={role}
                    value={state.formerParent}
                    onChange={(v) => set("formerParent", v)}
                    errors={errors}
                  />
                );
              default:
                return null;
            }
          })}
          {Object.keys(errors)
            .filter((p) =>
              [
                "teacher",
                "currentStudent",
                "currentParent",
                "formerStudent",
                "formerParent",
              ].includes(p),
            )
            .map((p) => (
              <GroupError key={p} errors={errors} path={p} />
            ))}
        </div>
      ) : null}

      {step === "evidence" ? (
        <div className="space-y-6">
          <EvidenceUploader
            userId={userId}
            useBlob={useBlob}
            items={state.evidence}
            onChange={(items) => set("evidence", items)}
            error={errors.evidence}
          />
          <section
            aria-labelledby="review-heading"
            className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm"
          >
            <h3 id="review-heading" className="font-semibold">
              {t("review.title")}
            </h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
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
              <dt className="text-slate-600">{t("fields.roles")}</dt>
              <dd>{state.roles.map((r) => tr(`role.${r}`)).join(", ")}</dd>
              <dt className="text-slate-600">{t("review.files")}</dt>
              <dd>{state.evidence.length}</dd>
            </dl>
            <p className="text-slate-600">{t("review.note")}</p>
          </section>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
        {stepIndex > 0 ? (
          <Button variant="secondary" onClick={() => goTo(stepIndex - 1)}>
            {t("back")}
          </Button>
        ) : (
          <span />
        )}
        {step === "evidence" ? (
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
