"use client";

import { SmilePlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/components/ui/cn";
import type { ChatReactionView } from "@/lib/chat-reactions";

/** The quick row shown when a message is selected. */
export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

/**
 * What the reactions look like once the member toggles `emoji` — shown at
 * once, before the server answers.
 */
export function toggledReactions(
  reactions: readonly ChatReactionView[],
  emoji: string,
  myName: string,
): ChatReactionView[] {
  const had = reactions.find((r) => r.emoji === emoji);
  if (!had)
    return [...reactions, { emoji, count: 1, mine: true, names: [myName] }];
  if (!had.mine)
    return reactions.map((r) =>
      r === had
        ? { ...r, count: r.count + 1, mine: true, names: [...r.names, myName] }
        : r,
    );
  if (had.count <= 1) return reactions.filter((r) => r !== had);
  return reactions.map((r) =>
    r === had
      ? {
          ...r,
          count: r.count - 1,
          mine: false,
          names: r.names.filter((n) => n !== myName),
        }
      : r,
  );
}

/** Chips under a bubble: click to add or remove yours; hover for who. */
export function ReactionChips({
  reactions,
  mine,
  disabled,
  onToggle,
}: {
  reactions: readonly ChatReactionView[];
  /** the member's own message (chips align right) */
  mine: boolean;
  disabled: boolean;
  onToggle: (emoji: string) => void;
}) {
  const t = useTranslations("chat.reactions");
  if (!reactions.length) return null;
  return (
    <ul
      aria-label={t("label")}
      className={cn("mt-1 flex flex-wrap gap-1", mine && "justify-end")}
    >
      {reactions.map((r) => {
        const rest = r.count - r.names.length;
        const who = [
          ...r.names,
          ...(rest > 0 ? [t("others", { count: rest })] : []),
        ].join(", ");
        return (
          <li key={r.emoji}>
            <button
              type="button"
              disabled={disabled}
              aria-pressed={r.mine}
              aria-label={`${t(r.mine ? "chipMine" : "chip", {
                emoji: r.emoji,
                count: r.count,
              })} — ${who}`}
              title={`${t("who")}: ${who}`}
              onClick={() => onToggle(r.emoji)}
              className={cn(
                "inline-flex min-h-7 items-center gap-1 rounded-full px-2 text-xs tabular-nums ring-1",
                r.mine
                  ? "bg-brand-50 font-semibold text-brand-800 ring-brand-300"
                  : "bg-white text-slate-700 ring-slate-200",
                !disabled && "hover:ring-brand-400",
              )}
            >
              <span aria-hidden="true" className="text-sm">
                {r.emoji}
              </span>
              {r.count}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** The quick emoji row and ＋ (every emoji), for the selected message. */
export function ReactionBar({
  reactions,
  onToggle,
  onMore,
}: {
  reactions: readonly ChatReactionView[];
  onToggle: (emoji: string) => void;
  onMore: () => void;
}) {
  const t = useTranslations("chat.reactions");
  return (
    <fieldset className="mt-1 flex items-center gap-0.5 rounded-full bg-white p-1 shadow">
      <legend className="sr-only">{t("add")}</legend>
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          aria-label={t("react", { emoji })}
          aria-pressed={reactions.some((r) => r.emoji === emoji && r.mine)}
          onClick={() => onToggle(emoji)}
          className="flex size-9 items-center justify-center rounded-full text-xl hover:bg-slate-100 aria-pressed:bg-brand-50"
        >
          <span aria-hidden="true">{emoji}</span>
        </button>
      ))}
      <button
        type="button"
        aria-label={t("more")}
        title={t("more")}
        onClick={onMore}
        className="flex size-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
      >
        <SmilePlus aria-hidden="true" className="size-5" />
      </button>
    </fieldset>
  );
}
