import { Search, SlidersHorizontal } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonClass } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { SearchForm } from "@/components/ui/search-form";
import { SearchButton } from "@/components/ui/submit-button";
import { LifeStage } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import { MEMBER_FILTER_OPTIONS } from "@/lib/audience";
import type { CohortOption } from "@/lib/cohorts";
import {
  ALL_ROLES,
  type DirectoryFilters,
  MAX_YEAR,
  MIN_YEAR,
} from "@/lib/directory";
import { AIS_DIVISIONS } from "@/lib/school";

/** GET form (SearchForm), so filtering also works without JavaScript (§10.1). */
export async function DirectoryFilterForm({
  filters,
  cohorts,
}: {
  filters: DirectoryFilters;
  cohorts: CohortOption[];
}) {
  const t = await getTranslations("directory");
  const tr = await getTranslations("roles");
  // Filters other than the name and 区分 live in the collapsible panel.
  const activeCount = [
    filters.yearFrom !== null || filters.yearTo !== null,
    filters.division,
    filters.cohort,
    filters.stage,
  ].filter(Boolean).length;
  return (
    <search aria-label={t("filters.legend")}>
      <SearchForm className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
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
          <SearchButton
            className="shrink-0"
            icon={<Search aria-hidden="true" className="size-4" />}
          >
            {t("filters.apply")}
          </SearchButton>
        </div>
        {/* 区分: former students unless chosen otherwise (DEFAULT_DIRECTORY_ROLE). */}
        <div className="mt-3 sm:max-w-xs">
          <Field id="dir-role" label={t("filters.role")}>
            {(aria) => (
              <Select
                {...aria}
                name="role"
                defaultValue={filters.role ?? ALL_ROLES}
              >
                {MEMBER_FILTER_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {tr(`audience.${r}`)}
                  </option>
                ))}
                <option value={ALL_ROLES}>{t("filters.anyRole")}</option>
              </Select>
            )}
          </Field>
        </div>
        <details className="group mt-3" open={activeCount > 0}>
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-2 text-sm font-medium text-brand-700 hover:bg-brand-50 [&::-webkit-details-marker]:hidden">
            <SlidersHorizontal aria-hidden="true" className="size-4" />
            {t("filters.more")}
            {activeCount > 0 ? (
              <span className="rounded-full bg-brand-100 px-1.5 text-xs text-brand-800">
                {t("filters.activeCount", { count: activeCount })}
              </span>
            ) : null}
          </summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                  {AIS_DIVISIONS.map((d) => (
                    <option key={d} value={d}>
                      {tr(`division.${d}`)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field id="dir-cohort" label={t("filters.cohort")}>
              {(aria) => (
                <Select
                  {...aria}
                  name="cohort"
                  defaultValue={filters.cohort ?? ""}
                >
                  <option value="">{t("filters.any")}</option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field id="dir-stage" label={t("filters.stage")}>
              {(aria) => (
                <Select
                  {...aria}
                  name="stage"
                  defaultValue={filters.stage ?? ""}
                >
                  <option value="">{t("filters.any")}</option>
                  {Object.values(LifeStage).map((s) => (
                    <option key={s} value={s}>
                      {tr(`stage.${s}`)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <div className="flex flex-wrap items-end gap-2">
              <SearchButton>{t("filters.applyFilters")}</SearchButton>
              <Link href="/app/directory" className={buttonClass("secondary")}>
                {t("filters.clear")}
              </Link>
            </div>
          </div>
        </details>
      </SearchForm>
    </search>
  );
}
