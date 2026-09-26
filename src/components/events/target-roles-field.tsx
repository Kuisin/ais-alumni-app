"use client";

import { useTranslations } from "next-intl";
import { RoleKey } from "@/generated/prisma/enums";

/** Target-role checkboxes shared by the event and news editors. None = all members. */
export function TargetRolesField({
  defaultValue,
}: {
  defaultValue: readonly RoleKey[];
}) {
  const t = useTranslations("adminContent");
  const tr = useTranslations("roles");
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-slate-800">
        {t("fields.targetRoles")}
      </legend>
      <p id="targetRoles-hint" className="text-sm text-slate-600">
        {t("fields.targetRolesHint")}
      </p>
      <div className="grid gap-1 sm:grid-cols-2">
        {Object.values(RoleKey).map((role) => (
          <label
            key={role}
            className="flex min-h-11 items-center gap-3 rounded-lg px-2 hover:bg-slate-50"
          >
            <input
              type="checkbox"
              name="targetRoles"
              value={role}
              defaultChecked={defaultValue.includes(role)}
              aria-describedby="targetRoles-hint"
              className="size-5"
            />
            <span className="text-sm">{tr(`role.${role}`)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
