"use client";

import { ChevronRight, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/field";
import { Link } from "@/i18n/navigation";
import { toKatakana } from "@/lib/names";
import { MemberTags } from "./member-tags";

export type ChatMemberRow = {
  id: string;
  name: string;
  /** 漢字（フリガナ） */
  otherNames: string | null;
  avatar: string;
  cohort: number | null;
  rep: boolean;
  self: boolean;
  /** the viewer may open their profile */
  linked: boolean;
};

/** A talk's members: search by name; tap a member to open their profile. */
export function ChatMemberList({ members }: { members: ChatMemberRow[] }) {
  const t = useTranslations("chat.info");
  const tc = useTranslations("chat");
  const uid = useId();
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return members;
    const kana = toKatakana(term);
    return members.filter(
      (m) =>
        `${m.name} ${m.otherNames ?? ""}`.toLowerCase().includes(term) ||
        (m.otherNames ?? "").includes(kana),
    );
  }, [members, q]);

  return (
    <div className="space-y-3">
      {members.length > 8 ? (
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
      ) : null}
      {shown.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-600">
          {t("noMatch")}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {shown.map((m) => {
            const row = (
              <>
                <Avatar src={m.avatar} name={m.name} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate font-medium text-slate-900">
                      {m.name}
                    </span>
                    {m.self ? (
                      <span className="rounded bg-slate-100 px-1.5 text-[10px] leading-4 font-medium text-slate-600">
                        {tc("you")}
                      </span>
                    ) : null}
                    <MemberTags cohort={m.cohort} rep={m.rep} />
                  </span>
                  {m.otherNames ? (
                    <span className="block truncate text-xs text-slate-500">
                      {m.otherNames}
                    </span>
                  ) : null}
                </span>
              </>
            );
            return (
              <li key={m.id}>
                {m.linked ? (
                  <Link
                    href={`/app/members/${m.id}`}
                    className="flex min-h-14 items-center gap-3 px-3 py-2 hover:bg-slate-50"
                  >
                    {row}
                    <ChevronRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-slate-400"
                    />
                  </Link>
                ) : (
                  <div className="flex min-h-14 items-center gap-3 px-3 py-2">
                    {row}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
