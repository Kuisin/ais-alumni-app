import { getTranslations } from "next-intl/server";
import { buttonClass } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Division, LifeStage, RoleKey } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import { type DirectoryFilters, MAX_YEAR, MIN_YEAR } from "@/lib/directory";

/** Plain GET form so filtering works without JavaScript (§10.1). */
export async function DirectoryFilterForm({
  filters,
}: {
  filters: DirectoryFilters;
}) {
  const t = await getTranslations("directory");
  const tr = await getTranslations("roles");
  return (
    <search aria-label={t("filters.legend")}>
      <form
        method="get"
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <Field id="dir-q" label={t("filters.q")}>
              {(aria) => (
                <Input
                  {...aria}
                  type="search"
                  name="q"
                  defaultValue={filters.q ?? ""}
                  placeholder={t("filters.qPlaceholder")}
                  maxLength={100}
                  autoComplete="off"
                />
              )}
            </Field>
          </div>
          <Field id="dir-role" label={t("filters.role")}>
            {(aria) => (
              <Select {...aria} name="role" defaultValue={filters.role ?? ""}>
                <option value="">{t("filters.anyRole")}</option>
                {Object.values(RoleKey).map((r) => (
                  <option key={r} value={r}>
                    {tr(`role.${r}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <fieldset className="space-y-1">
            <legend className="block text-sm font-medium text-slate-800">
              {t("filters.yearRange")}
            </legend>
            <div className="flex items-center gap-2">
              <label htmlFor="dir-from" className="sr-only">
                {t("filters.yearFrom")}
              </label>
              <Input
                id="dir-from"
                type="number"
                name="from"
                inputMode="numeric"
                min={MIN_YEAR}
                max={MAX_YEAR}
                placeholder={t("filters.yearFrom")}
                defaultValue={filters.yearFrom ?? ""}
              />
              <span aria-hidden="true">–</span>
              <label htmlFor="dir-to" className="sr-only">
                {t("filters.yearTo")}
              </label>
              <Input
                id="dir-to"
                type="number"
                name="to"
                inputMode="numeric"
                min={MIN_YEAR}
                max={MAX_YEAR}
                placeholder={t("filters.yearTo")}
                defaultValue={filters.yearTo ?? ""}
              />
            </div>
          </fieldset>
          <Field id="dir-division" label={t("filters.division")}>
            {(aria) => (
              <Select
                {...aria}
                name="division"
                defaultValue={filters.division ?? ""}
              >
                <option value="">{t("filters.any")}</option>
                {Object.values(Division).map((d) => (
                  <option key={d} value={d}>
                    {tr(`division.${d}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id="dir-stage" label={t("filters.stage")}>
            {(aria) => (
              <Select {...aria} name="stage" defaultValue={filters.stage ?? ""}>
                <option value="">{t("filters.any")}</option>
                {Object.values(LifeStage).map((s) => (
                  <option key={s} value={s}>
                    {tr(`stage.${s}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" className={buttonClass("primary")}>
            {t("filters.apply")}
          </button>
          <Link href="/app/directory" className={buttonClass("secondary")}>
            {t("filters.clear")}
          </Link>
        </div>
      </form>
    </search>
  );
}
