"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import {
  type AdminMemberFormState,
  updateMemberProfileAction,
} from "@/app/actions/admin-members";
import { NameFields } from "@/components/names/name-fields";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { useCloseOnSave } from "@/components/ui/view-edit";
import { GENDERS } from "@/lib/gender";
import type { NameParts } from "@/lib/names";
import { AdminFormResult } from "./form-result";

export type MemberProfileValues = Record<keyof NameParts, string> & {
  nameAtAis: string;
  dateOfBirth: string; // YYYY-MM-DD or ""
  bio: string;
  phone: string;
  gender: string; // MALE | FEMALE | OTHER | ""
};

export function MemberProfileForm({
  userId,
  values,
}: {
  userId: string;
  values: MemberProfileValues;
}) {
  const t = useTranslations("adminMembers.profile");
  const tc = useTranslations("common");
  const tg = useTranslations("profile.photo");
  const [state, action] = useActionState<AdminMemberFormState, FormData>(
    updateMemberProfileAction,
    {},
  );
  useCloseOnSave(state);
  const err = (k: string) =>
    state.fieldErrors?.[k] ? tc("errors.validation") : null;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="userId" value={userId} />
      <NameFields idPrefix="p-" values={values} error={(f) => err(f)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="p-nameAtAis" label={t("nameAtAis")} error={err("nameAtAis")}>
          {(a) => (
            <Input
              {...a}
              name="nameAtAis"
              defaultValue={values.nameAtAis}
              autoComplete="off"
            />
          )}
        </Field>
        <Field
          id="p-dateOfBirth"
          label={t("dateOfBirth")}
          error={err("dateOfBirth")}
        >
          {(a) => (
            <Input
              {...a}
              type="date"
              name="dateOfBirth"
              defaultValue={values.dateOfBirth}
            />
          )}
        </Field>
        <Field id="p-gender" label={t("gender")}>
          {(a) => (
            <Select {...a} name="gender" defaultValue={values.gender}>
              <option value="">{tg("genders.none")}</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {tg(`genders.${g}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field id="p-phone" label={t("phone")} error={err("phone")}>
          {(a) => (
            <Input
              {...a}
              type="tel"
              name="phone"
              defaultValue={values.phone}
              autoComplete="off"
            />
          )}
        </Field>
      </div>
      <Field id="p-bio" label={t("bio")} error={err("bio")}>
        {(a) => (
          <Textarea
            {...a}
            name="bio"
            defaultValue={values.bio}
            maxLength={2000}
          />
        )}
      </Field>
      <AdminFormResult state={state} />
      <SubmitButton pendingText={tc("saving")}>{t("save")}</SubmitButton>
    </form>
  );
}
