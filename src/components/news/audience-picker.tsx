"use client";

import { Search, UserPlus, Users, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  previewNewsAudienceAction,
  searchAudienceMembersAction,
} from "@/app/actions/admin-content";
import { CHOICE_CARD } from "@/components/events/target-roles-field";
import { Input } from "@/components/ui/field";
import type { CohortOption } from "@/lib/cohorts";
import {
  AUDIENCE_GROUPS,
  type AudienceGroup,
  type AudienceSpec,
  EVERYONE,
  isEveryone,
} from "@/lib/news-audience";
import type { NewsScope } from "@/lib/permissions";

export type AudienceMember = { id: string; name: string; kanji: string | null };

const CHECKBOX = "size-5 shrink-0 accent-brand-700 focus-visible:outline-none";
const SUBLEGEND = "text-sm font-medium text-slate-800";
const SMALL_BUTTON =
  "inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:border-brand-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 aria-pressed:border-brand-600 aria-pressed:bg-brand-50 aria-pressed:text-brand-800";

type CohortView = "all" | "graduated" | "current";

/**
 * 「受け取る人」 for a ニュース post: everyone, or any combination of groups,
 * 学年 (optionally with their parents) and individually chosen members. The
 * choice is serialized as JSON (AudienceSpec) into the hidden `audience`
 * input, and the number of members reached is shown live.
 *
 * Narrowed by the author's scope: current teachers always include current
 * teachers; 学年代表 choose only among their own 学年 (checked on save too).
 */
export function AudiencePicker({
  cohorts,
  scope = { kind: "ANY" },
  initialSpec,
  initialMembers,
  error,
}: {
  cohorts: readonly CohortOption[];
  scope?: NewsScope;
  initialSpec: AudienceSpec;
  /** names for the individually chosen members in `initialSpec.userIds` */
  initialMembers: readonly AudienceMember[];
  error?: string | null;
}) {
  const t = useTranslations("adminContent");
  const uid = useId();
  const ownCohorts = scope.kind === "COHORT" ? scope.cohortIds : null;
  const teacher = scope.kind === "TEACHER";
  const [custom, setCustom] = useState(
    ownCohorts !== null || !isEveryone(initialSpec),
  );
  const [groups, setGroups] = useState<AudienceGroup[]>(() =>
    teacher && !initialSpec.groups.includes("TEACHER_CURRENT")
      ? ["TEACHER_CURRENT", ...initialSpec.groups]
      : initialSpec.groups,
  );
  const [cohortIds, setCohortIds] = useState<string[]>(() => {
    if (!ownCohorts) return initialSpec.cohortIds;
    // 学年代表: their own 学年, all of them for a new post.
    const own = initialSpec.cohortIds.filter((c) => ownCohorts.includes(c));
    return own.length ? own : [...ownCohorts];
  });
  const [includeParents, setIncludeParents] = useState(
    initialSpec.includeParents,
  );
  const [members, setMembers] = useState<AudienceMember[]>(() => {
    const byId = new Map(initialMembers.map((m) => [m.id, m]));
    return initialSpec.userIds.map(
      (id) => byId.get(id) ?? { id, name: "—", kanji: null },
    );
  });

  const spec: AudienceSpec = useMemo(
    () =>
      custom
        ? {
            groups,
            cohortIds,
            includeParents: cohortIds.length > 0 && includeParents,
            userIds: members.map((m) => m.id),
          }
        : EVERYONE,
    [custom, groups, cohortIds, includeParents, members],
  );
  const json = JSON.stringify(spec);

  // Live recipient count (debounced; stale responses are ignored).
  const [count, setCount] = useState<number | null | "error">(null);
  const seq = useRef(0);
  useEffect(() => {
    const n = ++seq.current;
    setCount(null);
    const timer = setTimeout(async () => {
      try {
        const r = await previewNewsAudienceAction(JSON.parse(json));
        if (n === seq.current) setCount(r ? r.count : "error");
      } catch {
        if (n === seq.current) setCount("error");
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [json]);

  const toggle = <T,>(list: T[], v: T, on: boolean) =>
    on ? (list.includes(v) ? list : [...list, v]) : list.filter((x) => x !== v);

  const countLine = (
    <p
      aria-live="polite"
      className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-800"
    >
      <Users aria-hidden="true" className="size-4 shrink-0" />
      {count === null
        ? t("audience.counting")
        : count === "error"
          ? t("audience.countError")
          : t("audience.count", { count })}
    </p>
  );
  const errorLine = error ? (
    <p role="alert" className="text-sm text-red-700">
      {error}
    </p>
  ) : null;

  // 学年代表: only their own 学年 (students and former students in it).
  if (ownCohorts) {
    const own = cohorts.filter((c) => ownCohorts.includes(c.id));
    return (
      <div className="space-y-4">
        <input type="hidden" name="audience" value={json} />
        <fieldset className="min-w-0 space-y-2">
          <legend className={SUBLEGEND}>{t("audience.ownCohortLegend")}</legend>
          <p className="text-sm text-slate-500">
            {t("audience.ownCohortHint")}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {own.map((c) => (
              <label key={c.id} className={CHOICE_CARD}>
                <input
                  type="checkbox"
                  checked={cohortIds.includes(c.id)}
                  onChange={(e) =>
                    setCohortIds((l) => toggle(l, c.id, e.target.checked))
                  }
                  className={CHECKBOX}
                />
                <span className="text-sm">{c.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {errorLine}
        {countLine}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name="audience" value={json} />
      {teacher ? (
        <p className="text-sm text-slate-600">{t("audience.teachersAlways")}</p>
      ) : null}

      <fieldset className="min-w-0 space-y-2">
        <legend className="sr-only">{t("audience.mode")}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className={CHOICE_CARD}>
            <input
              type="radio"
              name={`${uid}-mode`}
              checked={!custom}
              onChange={() => setCustom(false)}
              className={CHECKBOX}
            />
            <span className="text-sm font-medium">
              {t("audience.everyone")}
              <span className="block text-xs font-normal text-slate-500">
                {t("audience.everyoneHint")}
              </span>
            </span>
          </label>
          <label className={CHOICE_CARD}>
            <input
              type="radio"
              name={`${uid}-mode`}
              checked={custom}
              onChange={() => setCustom(true)}
              className={CHECKBOX}
            />
            <span className="text-sm font-medium">
              {t("audience.custom")}
              <span className="block text-xs font-normal text-slate-500">
                {t("audience.customHint")}
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      {custom ? (
        <div className="space-y-6 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
          <p className="text-sm text-slate-600">{t("audience.anyHint")}</p>

          <fieldset className="min-w-0 space-y-2">
            <legend className={SUBLEGEND}>{t("audience.groupsLegend")}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {AUDIENCE_GROUPS.map((g) => (
                <label key={g} className={CHOICE_CARD}>
                  <input
                    type="checkbox"
                    checked={groups.includes(g)}
                    // A teacher's post always reaches current teachers.
                    disabled={teacher && g === "TEACHER_CURRENT"}
                    onChange={(e) =>
                      setGroups((l) => toggle(l, g, e.target.checked))
                    }
                    className={CHECKBOX}
                  />
                  <span className="text-sm">
                    {t(`audience.groups.${g}`)}
                    <span className="block text-xs text-slate-500">
                      {t(`audience.groupHints.${g}`)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <CohortPicker
            cohorts={cohorts}
            selected={cohortIds}
            onToggle={(id, on) => setCohortIds((l) => toggle(l, id, on))}
            onSet={setCohortIds}
            includeParents={includeParents}
            onIncludeParents={setIncludeParents}
          />

          <MemberPicker
            members={members}
            onAdd={(m) =>
              setMembers((l) => (l.some((x) => x.id === m.id) ? l : [...l, m]))
            }
            onRemove={(id) => setMembers((l) => l.filter((x) => x.id !== id))}
          />
        </div>
      ) : null}

      {errorLine}
      {countLine}
    </div>
  );
}

function CohortPicker({
  cohorts,
  selected,
  onToggle,
  onSet,
  includeParents,
  onIncludeParents,
}: {
  cohorts: readonly CohortOption[];
  selected: string[];
  onToggle: (id: string, on: boolean) => void;
  onSet: (ids: string[]) => void;
  includeParents: boolean;
  onIncludeParents: (on: boolean) => void;
}) {
  const t = useTranslations("adminContent");
  const uid = useId();
  const [filter, setFilter] = useState("");
  const [view, setView] = useState<CohortView>("all");
  const q = filter.trim().toLowerCase();
  const shown = cohorts.filter(
    (c) =>
      (view === "all" || c.graduated === (view === "graduated")) &&
      (!q || c.label.toLowerCase().includes(q)),
  );
  const views: [CohortView, string][] = [
    ["all", t("audience.showAll")],
    ["graduated", t("audience.showGraduated")],
    ["current", t("audience.showCurrent")],
  ];

  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className={SUBLEGEND}>{t("audience.cohortsLegend")}</legend>
      <p id={`${uid}-hint`} className="text-sm text-slate-500">
        {t("audience.cohortsHint")}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1">
          <label
            htmlFor={`${uid}-filter`}
            className="block text-sm text-slate-700"
          >
            {t("audience.cohortFilter")}
          </label>
          <Input
            id={`${uid}-filter`}
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t("audience.cohortFilterPlaceholder")}
            autoComplete="off"
          />
        </div>
        {/* biome-ignore lint/a11y/useSemanticElements: a toolbar of toggle buttons, not a form group */}
        <div
          role="group"
          aria-label={t("audience.show")}
          className="flex flex-wrap gap-1"
        >
          {views.map(([v, label]) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={SMALL_BUTTON}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {shown.length ? (
        <ul className="grid max-h-72 gap-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 sm:grid-cols-2">
          {shown.map((c) => (
            <li key={c.id}>
              <label className={CHOICE_CARD}>
                <input
                  type="checkbox"
                  checked={selected.includes(c.id)}
                  onChange={(e) => onToggle(c.id, e.target.checked)}
                  aria-describedby={`${uid}-hint`}
                  className={CHECKBOX}
                />
                <span className="text-sm">{c.label}</span>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">{t("audience.noCohorts")}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-sm text-slate-700">
          {t("audience.cohortsSelected", { count: selected.length })}
        </p>
        <button
          type="button"
          onClick={() =>
            onSet([...new Set([...selected, ...shown.map((c) => c.id)])])
          }
          disabled={!shown.length}
          className={SMALL_BUTTON}
        >
          {t("audience.selectShown")}
        </button>
        <button
          type="button"
          onClick={() => onSet([])}
          disabled={!selected.length}
          className={SMALL_BUTTON}
        >
          {t("audience.clearCohorts")}
        </button>
      </div>

      <label className={CHOICE_CARD}>
        <input
          type="checkbox"
          checked={includeParents}
          onChange={(e) => onIncludeParents(e.target.checked)}
          aria-describedby={`${uid}-parents-hint`}
          className={CHECKBOX}
        />
        <span className="text-sm">
          {t("audience.includeParents")}
          <span
            id={`${uid}-parents-hint`}
            className="block text-xs text-slate-500"
          >
            {t("audience.includeParentsHint")}
          </span>
        </span>
      </label>
    </fieldset>
  );
}

function MemberPicker({
  members,
  onAdd,
  onRemove,
}: {
  members: AudienceMember[];
  onAdd: (m: AudienceMember) => void;
  onRemove: (id: string) => void;
}) {
  const t = useTranslations("adminContent");
  const uid = useId();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<AudienceMember[] | null>(null);
  const [searching, setSearching] = useState(false);
  const seq = useRef(0);

  // Debounced search while typing (ignores stale responses).
  useEffect(() => {
    const term = q.trim();
    const n = ++seq.current;
    if (!term) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const found = await searchAudienceMembersAction(term);
        if (n === seq.current) setResults(found);
      } catch {
        if (n === seq.current) setResults([]);
      } finally {
        if (n === seq.current) setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  const label = (m: AudienceMember) =>
    m.kanji ? `${m.name}（${m.kanji}）` : m.name;

  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className={SUBLEGEND}>{t("audience.membersLegend")}</legend>

      {members.length ? (
        <div className="space-y-2">
          <p className="text-sm text-slate-700">
            {t("audience.membersSelected", { count: members.length })}
          </p>
          <ul className="flex flex-wrap gap-2">
            {members.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onRemove(m.id)}
                  aria-label={t("audience.removeMember", { name: label(m) })}
                  className="inline-flex min-h-11 items-center gap-1 rounded-full border border-brand-300 bg-brand-50 py-1 pr-2 pl-3 text-sm text-brand-900 hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                >
                  <span>
                    {m.name}
                    {m.kanji ? (
                      <span className="ml-1 text-xs text-brand-700">
                        {m.kanji}
                      </span>
                    ) : null}
                  </span>
                  <X aria-hidden="true" className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-1">
        <label
          htmlFor={`${uid}-search`}
          className="block text-sm text-slate-700"
        >
          {t("audience.memberSearch")}
        </label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
          />
          <Input
            id={`${uid}-search`}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              // Enter searches; it must not submit the post.
              if (e.key === "Enter") e.preventDefault();
            }}
            aria-describedby={`${uid}-search-hint ${uid}-search-status`}
            autoComplete="off"
            className="pl-9"
          />
        </div>
        <p id={`${uid}-search-hint`} className="text-xs text-slate-500">
          {t("audience.memberSearchHint")}
        </p>
      </div>

      <div id={`${uid}-search-status`} aria-live="polite">
        {searching ? (
          <p className="text-sm text-slate-500">{t("audience.searching")}</p>
        ) : results && results.length === 0 ? (
          <p className="text-sm text-slate-500">{t("audience.noResults")}</p>
        ) : null}
      </div>

      {!searching && results?.length ? (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {results.map((m) => {
            const added = members.some((x) => x.id === m.id);
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onAdd(m)}
                  disabled={added}
                  aria-label={t("audience.addMember", { name: label(m) })}
                  className="flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-default disabled:text-slate-400 disabled:hover:bg-white"
                >
                  <UserPlus
                    aria-hidden="true"
                    className="size-4 shrink-0 text-brand-700"
                  />
                  <span className="min-w-0 flex-1">
                    {m.name}
                    {m.kanji ? (
                      <span className="ml-2 text-xs text-slate-500">
                        {m.kanji}
                      </span>
                    ) : null}
                  </span>
                  {added ? (
                    <span className="text-xs">{t("audience.added")}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </fieldset>
  );
}
