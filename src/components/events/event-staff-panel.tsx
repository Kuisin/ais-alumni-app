"use client";

import { Search, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { searchAudienceMembersAction } from "@/app/actions/admin-content";
import { setEventStaffAction } from "@/app/actions/check-in";
import { Input } from "@/components/ui/field";

type Member = { id: string; name: string; kanji: string | null };

/** Admins pick the members who may run check-in at this event. */
export function EventStaffPanel({
  eventId,
  staff,
}: {
  eventId: string;
  staff: Member[];
}) {
  const t = useTranslations("adminContent.staff");
  const ta = useTranslations("adminContent.audience");
  const router = useRouter();
  const uid = useId();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Member[] | null>(null);
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
      const found = await searchAudienceMembersAction(term).catch(() => []);
      if (n === seq.current) setResults(found);
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  const set = (userId: string, on: boolean) =>
    start(async () => {
      await setEventStaffAction(eventId, userId, on);
      setQ("");
      router.refresh();
    });

  const ids = new Set(staff.map((s) => s.id));
  const fresh = results?.filter((r) => !ids.has(r.id)) ?? null;

  return (
    <div className="space-y-3" aria-busy={pending}>
      <p className="text-sm text-slate-600">{t("hint")}</p>
      {staff.length ? (
        <ul className="flex flex-wrap gap-2">
          {staff.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                disabled={pending}
                onClick={() => set(m.id, false)}
                aria-label={t("remove", { name: m.name })}
                className="inline-flex min-h-11 items-center gap-1 rounded-full border border-brand-300 bg-brand-50 py-1 pr-2 pl-3 text-sm text-brand-900 hover:bg-brand-100"
              >
                {m.name}
                {m.kanji ? (
                  <span className="text-xs text-brand-700">{m.kanji}</span>
                ) : null}
                <X aria-hidden="true" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-600">{t("none")}</p>
      )}
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
        />
        <label htmlFor={`${uid}-q`} className="sr-only">
          {t("add")}
        </label>
        <Input
          id={`${uid}-q`}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("add")}
          autoComplete="off"
          className="pl-9"
        />
      </div>
      <div aria-live="polite">
        {fresh && fresh.length === 0 ? (
          <p className="text-sm text-slate-600">{ta("noResults")}</p>
        ) : null}
        {fresh?.length ? (
          <ul className="space-y-1">
            {fresh.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => set(r.id, true)}
                  className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-slate-50"
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
