"use client";

import { Search, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import {
  type CohortStudent,
  searchCohortStudentsAction,
  setCohortRepAction,
} from "@/app/actions/admin-positions";
import { Alert } from "@/components/ui/card";
import { Input } from "@/components/ui/field";

/** Admin: the 学年代表 of one 学年, chosen from its students and graduates. */
export function CohortReps({
  cohortId,
  reps,
}: {
  cohortId: string;
  reps: CohortStudent[];
}) {
  const t = useTranslations("cohorts.reps");
  const ta = useTranslations("adminMembers.positions");
  const router = useRouter();
  const uid = useId();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CohortStudent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const seq = useRef(0);

  useEffect(() => {
    const term = q.trim();
    const n = ++seq.current;
    if (!term) {
      setResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      const found = await searchCohortStudentsAction(cohortId, term).catch(
        () => [],
      );
      if (n === seq.current) setResults(found);
    }, 250);
    return () => clearTimeout(timer);
  }, [q, cohortId]);

  const set = (userId: string, on: boolean) =>
    start(async () => {
      setError(null);
      const r = await setCohortRepAction(cohortId, userId, on);
      if (!r.ok) setError(ta(r.message ?? "errors.invalid"));
      setQ("");
      router.refresh();
    });

  const ids = new Set(reps.map((r) => r.id));
  const fresh = results?.filter((r) => !ids.has(r.id)) ?? null;

  return (
    <div className="space-y-2 rounded-lg bg-slate-50 p-3" aria-busy={pending}>
      <p className="text-sm font-semibold">{t("title")}</p>
      {reps.length ? (
        <ul className="flex flex-wrap gap-2">
          {reps.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (window.confirm(t("removeConfirm", { name: r.name })))
                    set(r.id, false);
                }}
                aria-label={t("remove", { name: r.name })}
                className="inline-flex min-h-11 items-center gap-1 rounded-full border border-brand-300 bg-white py-1 pr-2 pl-3 text-sm text-brand-900 hover:bg-brand-50"
              >
                {r.name}
                {r.kanji ? (
                  <span className="text-xs text-brand-700">{r.kanji}</span>
                ) : null}
                <X aria-hidden="true" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-600">{t("none")}</p>
      )}
      <p className="text-xs text-slate-500">{t("hint")}</p>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
        />
        <label htmlFor={`${uid}-q`} className="sr-only">
          {t("search")}
        </label>
        <Input
          id={`${uid}-q`}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search")}
          autoComplete="off"
          className="pl-9"
        />
      </div>
      <div aria-live="polite">
        {error ? <Alert tone="error">{error}</Alert> : null}
        {fresh && fresh.length === 0 ? (
          <p className="text-sm text-slate-600">{t("noResults")}</p>
        ) : null}
        {fresh?.length ? (
          <ul className="space-y-1">
            {fresh.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => set(r.id, true)}
                  aria-label={t("add", { name: r.name })}
                  className="flex min-h-11 w-full items-center gap-2 rounded-lg bg-white px-3 text-left text-sm hover:bg-brand-50"
                >
                  <UserPlus
                    aria-hidden="true"
                    className="size-4 text-brand-700"
                  />
                  {r.name}
                  {r.kanji ? (
                    <span className="text-slate-600">{r.kanji}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
