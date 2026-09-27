"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import {
  type ProfileActionState,
  updateProfileAction,
} from "@/app/actions/profile";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { useCloseOnSave } from "@/components/ui/view-edit";
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
  useCloseOnSave(state);
  const err = (f: string) =>
    state?.fields?.includes(f) ? t("errors.invalid") : null;

  return (
    <form
      action={action}
      className="space-y-6 [&>fieldset+fieldset]:border-t [&>fieldset+fieldset]:border-slate-100 [&>fieldset+fieldset]:pt-5"
      noValidate
    >
      <fieldset className="space-y-4">
        <legend className="sr-only">{t("sections.basic")}</legend>
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

      <fieldset className="space-y-4">
        <legend className="mb-1 font-semibold">{t("sections.contact")}</legend>
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

      {showAutoAccept ? (
        <fieldset className="space-y-2">
          <legend className="font-semibold">{t("sections.follows")}</legend>
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
      ) : (
        <input
          type="hidden"
          name="autoAcceptSameYear"
          value={values.autoAcceptSameYear ? "on" : ""}
        />
      )}

      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 -mx-4 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6 lg:bottom-0">
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
