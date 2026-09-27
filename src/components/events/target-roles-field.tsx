"use client";

import { useTranslations } from "next-intl";
import type { AudienceKey } from "@/generated/prisma/enums";
import { AUDIENCE_KEYS } from "@/lib/audience";

/** Selectable-card checkbox/radio label, shared by the event and news editors. */
export const CHOICE_CARD =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 transition-colors hover:border-brand-300 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-600";

/**
 * Audience checkboxes shared by the event and news editors (卒業生 and
 * 元在校生 separately). None = all members.
 */
export function TargetRolesField({
  defaultValue,
}: {
  defaultValue: readonly AudienceKey[];
}) {
  const t = useTranslations("adminContent");
  const tr = useTranslations("roles");
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="text-sm font-medium text-slate-800">
        {t("fields.targetRoles")}
      </legend>
      <p id="targetRoles-hint" className="text-sm text-slate-500">
        {t("fields.targetRolesHint")}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {AUDIENCE_KEYS.map((role) => (
          <label key={role} className={CHOICE_CARD}>
            <input
              type="checkbox"
              name="targetAudiences"
              value={role}
              defaultChecked={defaultValue.includes(role)}
              aria-describedby="targetRoles-hint"
              className="size-5 shrink-0 accent-brand-700 focus-visible:outline-none"
            />
            <span className="text-sm">
              {tr(`audience.${role}`)}
              <span className="block text-xs text-slate-500">
                {tr(`audienceHint.${role}`)}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
