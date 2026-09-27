"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import {
  type ProfileActionState,
  updateProfileAction,
} from "@/app/actions/profile";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { SOCIAL_KEYS, type SocialLinks } from "./social-links";

export type ProfileFormValues = {
  bio: string;
  phone: string;
  autoAcceptSameYear: boolean;
  social: SocialLinks;
};

export function ResultMessage({
  state,
  ns,
}: {
  state: ProfileActionState;
  ns: (k: string) => string;
}) {
  return (
    <p
      aria-live="polite"
      className={state?.ok ? "text-sm text-green-800" : "text-sm text-red-700"}
    >
      {state ? ns(state.message) : null}
    </p>
  );
}

export function ProfileForm({
  values,
  showAutoAccept,
}: {
  values: ProfileFormValues;
  showAutoAccept: boolean;
}) {
  const t = useTranslations("profile");
  const [state, action] = useActionState(updateProfileAction, null);
  const err = (f: string) =>
    state?.fields?.includes(f) ? t("errors.invalid") : null;

  return (
    <form action={action} className="space-y-4" noValidate>
      <Card>
        <fieldset className="space-y-4">
          <legend className="mb-1 text-lg font-semibold">
            {t("sections.basic")}
          </legend>
          <Field
            id="bio"
            label={t("fields.bio")}
            hint={t("hints.bio")}
            error={err("bio")}
          >
            {(a) => (
              <Textarea
                {...a}
                name="bio"
                defaultValue={values.bio}
                maxLength={1000}
              />
            )}
          </Field>
        </fieldset>
      </Card>

      <Card>
        <fieldset className="space-y-4">
          <legend className="mb-1 text-lg font-semibold">
            {t("sections.contact")}
          </legend>
          <p className="text-sm text-slate-600">{t("hints.privateTier")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="phone" label={t("fields.phone")} error={err("phone")}>
              {(a) => (
                <Input
                  {...a}
                  name="phone"
                  type="tel"
                  defaultValue={values.phone}
                  maxLength={40}
                  autoComplete="tel"
                />
              )}
            </Field>
            {SOCIAL_KEYS.map((k) => (
              <Field
                key={k}
                id={`social-${k}`}
                label={t(`fields.${k}`)}
                error={err(k)}
              >
                {(a) => (
                  <Input
                    {...a}
                    name={k}
                    type="url"
                    inputMode="url"
                    defaultValue={values.social[k] ?? ""}
                    placeholder="https://"
                    maxLength={300}
                  />
                )}
              </Field>
            ))}
          </div>
          <p className="text-sm text-slate-600">{t("hints.socialUrl")}</p>
        </fieldset>
      </Card>

      {showAutoAccept ? (
        <Card>
          <fieldset className="space-y-2">
            <legend className="text-lg font-semibold">
              {t("sections.follows")}
            </legend>
            <label className="flex min-h-11 items-start gap-3">
              <input
                type="checkbox"
                name="autoAcceptSameYear"
                defaultChecked={values.autoAcceptSameYear}
                className="mt-1 size-5"
              />
              <span>
                <span className="block">{t("autoAccept.label")}</span>
                <span className="block text-sm text-slate-600">
                  {t("autoAccept.hint")}
                </span>
              </span>
            </label>
          </fieldset>
        </Card>
      ) : (
        <input
          type="hidden"
          name="autoAcceptSameYear"
          value={values.autoAcceptSameYear ? "on" : ""}
        />
      )}

      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 flex flex-col-reverse gap-2 rounded-xl border border-slate-200 bg-white/90 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-end sm:gap-3 lg:bottom-4">
        <ResultMessage state={state} ns={t} />
        <SubmitButton
          pendingText={t("saving")}
          className="w-full px-8 sm:w-auto"
        >
          {t("save")}
        </SubmitButton>
      </div>
    </form>
  );
}
