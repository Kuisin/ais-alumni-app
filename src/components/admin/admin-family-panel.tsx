"use client";

import { Check, Search, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import {
  type AdminFamilyResult,
  addFamilyLinkAction,
  confirmFamilyLinkAdminAction,
  type FamilyCandidate,
  removeFamilyLinkAdminAction,
  searchFamilyCandidatesAction,
} from "@/app/actions/admin-family";
import { Button } from "@/components/ui/button";
import { Alert, Badge } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { Link } from "@/i18n/navigation";

export type AdminFamilyLink = {
  id: string;
  /** the other person's side: they are the member's parent / child */
  as: "parent" | "child";
  other: { id: string; name: string; otherNames: string | null } | null;
  /** a child without an account (name given by the parent) */
  childName: string | null;
  confirmed: boolean;
};

/** Admin: a member's family links — add, confirm and remove. */
export function AdminFamilyPanel({
  memberId,
  links,
  relatives,
}: {
  memberId: string;
  links: AdminFamilyLink[];
  /** others in the same family without a direct link (siblings etc.) */
  relatives: { id: string; name: string }[];
}) {
  const t = useTranslations("adminMembers.family");
  const router = useRouter();
  const uid = useId();
  const [as, setAs] = useState<"parent" | "child">("child");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<FamilyCandidate[] | null>(null);
  const [result, setResult] = useState<AdminFamilyResult | null>(null);
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
      const found = await searchFamilyCandidatesAction(
        memberId,
        as,
        term,
      ).catch(() => []);
      if (n === seq.current) setResults(found);
    }, 250);
    return () => clearTimeout(timer);
  }, [q, as, memberId]);

  const run = (fn: () => Promise<AdminFamilyResult>) =>
    start(async () => {
      const r = await fn();
      setResult(r);
      if (r.ok) {
        setQ("");
        router.refresh();
      }
    });

  const linked = new Set(links.map((l) => l.other?.id).filter(Boolean));
  const fresh = results?.filter((r) => !linked.has(r.id)) ?? null;

  return (
    <div className="space-y-4" aria-busy={pending}>
      {links.length ? (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {links.map((l) => (
            <li
              key={l.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge tone="slate">{t(`as.${l.as}`)}</Badge>
                  {l.other ? (
                    <Link
                      href={`/app/admin/members/${l.other.id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {l.other.name}
                    </Link>
                  ) : (
                    <span className="font-medium">
                      {l.childName ?? "—"}{" "}
                      <span className="text-xs text-slate-500">
                        {t("noAccount")}
                      </span>
                    </span>
                  )}
                  <Badge tone={l.confirmed ? "green" : "amber"}>
                    {l.confirmed ? t("confirmed") : t("pending")}
                  </Badge>
                </p>
                {l.other?.otherNames ? (
                  <p className="text-xs text-slate-500">{l.other.otherNames}</p>
                ) : null}
              </div>
              <div className="flex gap-2">
                {!l.confirmed && l.other ? (
                  <Button
                    variant="secondary"
                    disabled={pending}
                    onClick={() =>
                      run(() => confirmFamilyLinkAdminAction(l.id))
                    }
                  >
                    <Check aria-hidden="true" className="size-4" />
                    {t("confirm")}
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  disabled={pending}
                  aria-label={t("removeLabel", {
                    name: l.other?.name ?? l.childName ?? "—",
                  })}
                  onClick={() => {
                    if (
                      window.confirm(
                        l.confirmed ? t("removeConfirmed") : t("removePending"),
                      )
                    )
                      run(() => removeFamilyLinkAdminAction(l.id));
                  }}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  {t("remove")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-600">{t("none")}</p>
      )}
      {relatives.length ? (
        <p className="text-sm text-slate-600">
          {t("relatives")}{" "}
          {relatives.map((r, i) => (
            <span key={r.id}>
              {i ? "、" : ""}
              <Link
                href={`/app/admin/members/${r.id}`}
                className="text-brand-700 hover:underline"
              >
                {r.name}
              </Link>
            </span>
          ))}
        </p>
      ) : null}

      <div className="space-y-2 rounded-lg bg-slate-50 p-3">
        <p className="text-sm font-semibold">{t("add")}</p>
        <div className="grid gap-2 sm:grid-cols-[12rem_1fr]">
          <label htmlFor={`${uid}-as`} className="sr-only">
            {t("addAs")}
          </label>
          <Select
            id={`${uid}-as`}
            value={as}
            onChange={(e) => setAs(e.target.value as "parent" | "child")}
          >
            <option value="child">{t("addChild")}</option>
            <option value="parent">{t("addParent")}</option>
          </Select>
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
        </div>
        <p className="text-xs text-slate-500">{t("addHint")}</p>
        <div aria-live="polite" className="space-y-2">
          {result ? (
            <Alert tone={result.ok ? "success" : "error"}>
              {t(result.message ?? "errors.notFound")}
            </Alert>
          ) : null}
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
                    onClick={() =>
                      run(() => addFamilyLinkAction(memberId, r.id, as))
                    }
                    aria-label={t("addLabel", {
                      name: r.name,
                      as: t(`as.${as}`),
                    })}
                    className="flex min-h-11 w-full items-center gap-2 rounded-lg bg-white px-3 text-left text-sm hover:bg-brand-50"
                  >
                    <UserPlus
                      aria-hidden="true"
                      className="size-4 text-brand-700"
                    />
                    {r.name}
                    {r.other ? (
                      <span className="text-slate-600">{r.other}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
