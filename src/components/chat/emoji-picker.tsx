"use client";

import { Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/components/ui/cn";
import data from "./emoji-data.json";

/**
 * A searchable emoji grid for chat reactions — any emoji, by category, with
 * English and Japanese names (emoji-data.json, made by
 * scripts/emoji-data.mjs from emojibase; the app's picker uses the same
 * list). Loaded on demand (next/dynamic in chat-room.tsx).
 */

type Emoji = { emoji: string; en: string; ja: string; search: string };
const GROUP_KEYS = [
  "smileys",
  "people",
  "animals",
  "food",
  "travel",
  "activities",
  "objects",
  "symbols",
  "flags",
] as const;
type GroupKey = (typeof GROUP_KEYS)[number];
type Group = { key: GroupKey; items: Emoji[] };

let parsed: Group[] | null = null;

/** The bundled list, parsed on first use. */
function groups(): Group[] {
  if (parsed) return parsed;
  parsed = (data.groups as { key: GroupKey; items: string }[]).map((g) => ({
    key: g.key,
    items: g.items.split("\n").map((line) => {
      const [emoji = "", en = "", ja = "", words = ""] = line.split("\t");
      return { emoji, en, ja, search: `${en} ${ja} ${words}`.toLowerCase() };
    }),
  }));
  return parsed;
}

const MAX_RESULTS = 400;

export function EmojiPicker({
  onPick,
  onClose,
}: {
  onPick: (emoji: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations("chat.reactions");
  const locale = useLocale();
  const all = useMemo(groups, []);
  const [group, setGroup] = useState<GroupKey>("smileys");
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    search.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const q = query.trim().toLowerCase();
  const shown = useMemo(() => {
    if (!q) return all.find((g) => g.key === group)?.items ?? [];
    const out: Emoji[] = [];
    for (const g of all)
      for (const e of g.items) {
        if (e.search.includes(q) || e.emoji === q) out.push(e);
        if (out.length >= MAX_RESULTS) return out;
      }
    return out;
  }, [all, group, q]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label={t("back")}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-slate-900/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("picker")}
        className="relative flex h-[60dvh] w-full max-w-md flex-col rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-xl sm:h-[28rem] sm:rounded-2xl"
      >
        <div className="flex items-center gap-2 p-2">
          <label className="flex min-h-11 flex-1 items-center gap-2 rounded-full bg-slate-100 px-3">
            <Search aria-hidden="true" className="size-4 text-slate-500" />
            <span className="sr-only">{t("search")}</span>
            <input
              ref={search}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search")}
              className="min-w-0 flex-1 bg-transparent text-base outline-none"
            />
          </label>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("back")}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-slate-100"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        {q ? null : (
          <div className="flex gap-1 overflow-x-auto px-2 pb-2">
            {all.map((g) => (
              <button
                key={g.key}
                type="button"
                aria-pressed={g.key === group}
                onClick={() => setGroup(g.key)}
                className={cn(
                  "min-h-9 shrink-0 rounded-full px-3 text-xs font-medium",
                  g.key === group
                    ? "bg-brand-700 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                )}
              >
                {t(`groups.${g.key}`)}
              </button>
            ))}
          </div>
        )}
        <div className="flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
          {shown.length ? (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))]">
              {shown.map((e) => (
                <li key={e.emoji}>
                  <button
                    type="button"
                    onClick={() => onPick(e.emoji)}
                    aria-label={locale === "ja" ? e.ja : e.en}
                    title={locale === "ja" ? e.ja : e.en}
                    className="flex size-11 items-center justify-center rounded-lg text-2xl hover:bg-slate-100"
                  >
                    <span aria-hidden="true">{e.emoji}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-center text-sm text-slate-600">
              {t("noResults")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
