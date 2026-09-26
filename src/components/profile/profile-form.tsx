"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import {
  type ProfileActionState,
  updateProfileAction,
} from "@/app/actions/profile";
import { NameFields } from "@/components/names/name-fields";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { NameParts } from "@/lib/names";
import { SOCIAL_KEYS, type SocialLinks } from "./social-links";

export type ProfileFormValues = Record<keyof NameParts, string> & {
  nameAtAis: string;
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
    <form action={action} className="space-y-6" noValidate>
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">{t("sections.basic")}</legend>
        <NameFields
          values={values}
          error={(f) =>
            state?.fields?.includes(f) ? t("errors.invalid") : null
          }
        />
        <Field
          id="nameAtAis"
          label={t("fields.nameAtAis")}
          hint={t("hints.nameAtAis")}
          error={err("nameAtAis")}
        >
          {(a) => (
            <Input
              {...a}
              name="nameAtAis"
              defaultValue={values.nameAtAis}
              maxLength={100}
            />
          )}
        </Field>
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
        <legend className="text-lg font-semibold">
          {t("sections.contact")}
        </legend>
        <p className="text-sm text-slate-600">{t("hints.privateTier")}</p>
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
        <p className="text-sm text-slate-600">{t("hints.socialUrl")}</p>
      </fieldset>

      {showAutoAccept ? (
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
      ) : (
        <input
          type="hidden"
          name="autoAcceptSameYear"
          value={values.autoAcceptSameYear ? "on" : ""}
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingText={t("saving")}>{t("save")}</SubmitButton>
        <ResultMessage state={state} ns={t} />
      </div>
    </form>
  );
}
