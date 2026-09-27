"use client";

import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { startDirectChatAction } from "@/app/actions/chat";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { useRouter } from "@/i18n/navigation";

type Person = {
  id: string;
  name: string;
  kanji: string | null;
  avatar: string | null;
};

/** Opens (or creates) the 1:1 talk and goes there. */
function useStartTalk() {
  const t = useTranslations("chat.new.errors");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const open = (id: string) =>
    start(async () => {
      setError(null);
      const r = await startDirectChatAction(id).catch(() => null);
      if (r?.ok) router.push(`/app/chat/${r.groupId}`);
      else setError(t(r?.error ?? "forbidden"));
    });
  return { pending, error, open };
}

export function StartTalkList({ people }: { people: Person[] }) {
  const { pending, error, open } = useStartTalk();
  return (
    <div className="space-y-3">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-white shadow-sm">
        {people.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              disabled={pending}
              onClick={() => open(p.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 disabled:opacity-60"
            >
              <Avatar src={p.avatar} name={p.name} size={44} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{p.name}</span>
                {p.kanji ? (
                  <span className="block truncate text-sm text-slate-500">
                    {p.kanji}
                  </span>
                ) : null}
              </span>
              <MessageCircle
                aria-hidden="true"
                className="size-5 text-brand-700"
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 「メッセージ」 on a member's profile. */
export function MessageButton({ memberId }: { memberId: string }) {
  const t = useTranslations("chat");
  const { pending, error, open } = useStartTalk();
  return (
    <div className="space-y-2">
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() => open(memberId)}
      >
        <MessageCircle aria-hidden="true" className="size-4" />
        {t("message")}
      </Button>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}
