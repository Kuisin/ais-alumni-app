"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { searchOrgsAction } from "@/app/actions/history";
import { type OrgKind, type OrgOption, orgNameKey } from "@/lib/organizations";

/**
 * Search-as-you-type picker for a school or company. Picking an existing
 * one submits its id; if nothing matches, "Add “…”" keeps the typed name and
 * the server creates it once (near-identical names are merged by key).
 * ARIA combobox pattern: ↑/↓ to move, Enter to pick, Esc to close.
 */
export function OrgCombobox({
  kind,
  id,
  label,
  defaultId,
  defaultName,
  error,
}: {
  kind: OrgKind;
  id: string;
  label: string;
  defaultId?: string;
  defaultName?: string;
  error?: string | null;
}) {
  const t = useTranslations("history");
  const [text, setText] = useState(defaultName ?? "");
  const [orgId, setOrgId] = useState(defaultId ?? "");
  const [options, setOptions] = useState<OrgOption[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const seq = useRef(0);

  // Debounced search while typing (ignores stale responses).
  useEffect(() => {
    if (!open) return;
    const q = text.trim();
    if (!q) {
      setOptions([]);
      return;
    }
    const n = ++seq.current;
    const timer = setTimeout(async () => {
      const found = await searchOrgsAction(kind, q);
      if (n === seq.current) {
        setOptions(found);
        setActive(0);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [text, kind, open]);

  const typedKey = orgNameKey(text);
  const exact = options.some((o) => orgNameKey(o.name) === typedKey);
  const items: ({ type: "org"; org: OrgOption } | { type: "new" })[] = [
    ...options.map((org) => ({ type: "org" as const, org })),
    ...(text.trim() && !exact ? [{ type: "new" as const }] : []),
  ];

  function pick(i: number) {
    const item = items[i];
    if (!item) return;
    if (item.type === "org") {
      setText(item.org.name);
      setOrgId(item.org.id);
    } else {
      setOrgId("");
    }
    setOpen(false);
  }

  const optionId = (i: number) => `${listId}-${i}`;
  const describedBy = [error ? `${id}-error` : null, `${id}-hint`]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="relative space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
        <span className="ml-1 text-red-700" aria-hidden="true">
          *
        </span>
      </label>
      <input type="hidden" name={`${kind}Id`} value={orgId} />
      <input
        id={id}
        name={kind}
        role="combobox"
        aria-expanded={open && items.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && items.length ? optionId(active) : undefined
        }
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        required
        maxLength={120}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOrgId("");
          setOpen(true);
        }}
        onFocus={() => text && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!open || !items.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % items.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a - 1 + items.length) % items.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(active);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base aria-[invalid=true]:border-red-600"
      />
      {open && items.length ? (
        <div
          id={listId}
          role="listbox"
          className="animate-fade absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
        >
          {items.map((item, i) => (
            <div
              key={item.type === "org" ? item.org.id : "new"}
              tabIndex={-1}
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  pick(i);
                }
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${
                i === active ? "bg-brand-50 text-brand-800" : ""
              }`}
            >
              {item.type === "org" ? (
                <>
                  <span>{item.org.name}</span>
                  <span className="text-xs text-slate-500">
                    {t("orgMembers", { count: item.org.count })}
                  </span>
                </>
              ) : (
                <span className="font-medium text-brand-700">
                  {t("orgAddNew", { name: text.trim() })}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : null}
      <p id={`${id}-hint`} className="text-sm text-slate-600">
        {orgId
          ? t("orgPicked")
          : text.trim()
            ? t("orgWillAdd")
            : t(`orgHint.${kind}`)}
      </p>
      {error ? (
        <p id={`${id}-error`} className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
