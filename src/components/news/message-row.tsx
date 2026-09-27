import { Calendar, ChevronRight, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/components/ui/cn";
import { LinkPendingIcon } from "@/components/ui/link-pending";
import type { PositionKey } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import { displayName, formatDate } from "@/lib/format";
import { UnreadBadge } from "./unread-badge";

type Sender = { nameRomaji: string | null; nameKanji: string | null };

/** "Name (Class representative)", or the committee when an admin sent it. */
export function SenderLabel({
  sender,
  position,
}: {
  sender: Sender;
  position: PositionKey | null;
}) {
  const t = useTranslations("broadcast");
  return position
    ? t("fromPosition", {
        name: displayName(sender),
        position: t(`positions.${position}`),
      })
    : t("fromCommittee");
}

export type MessageRowData = {
  readAt: Date | null;
  broadcast: {
    id: string;
    title: string;
    createdAt: Date;
    editedAt?: Date | null;
    position: PositionKey | null;
    sender: Sender;
  };
};

/** One message in the member's "Messages for you" list. */
export function MessageRow({
  row,
  locale,
}: {
  row: MessageRowData;
  locale: "ja" | "en";
}) {
  const tn = useTranslations("news");
  const b = row.broadcast;
  const unread = !row.readAt;
  return (
    <Link
      href={`/app/news/messages/${b.id}`}
      className={cn(
        "group flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow-md focus-visible:outline-2",
        unread ? "border-brand-200 ring-1 ring-brand-100" : "border-slate-200",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          {unread ? <UnreadBadge /> : null}
          <span className="inline-flex items-center gap-1.5">
            <Calendar aria-hidden="true" className="size-4 shrink-0" />
            <time dateTime={b.createdAt.toISOString()}>
              {formatDate(b.createdAt, locale)}
            </time>
          </span>
        </div>
        <h3
          className={cn(
            "mt-1 break-words text-slate-900",
            unread ? "font-bold" : "font-semibold",
          )}
        >
          {b.title}
          {b.editedAt ? (
            <span className="ml-2 text-xs font-normal text-slate-500">
              {tn("messages.edited")}
            </span>
          ) : null}
        </h3>
        <p className="mt-1 inline-flex min-w-0 items-center gap-1.5 text-sm text-slate-600">
          <UserRound aria-hidden="true" className="size-4 shrink-0" />
          <span className="truncate">
            <SenderLabel sender={b.sender} position={b.position} />
          </span>
        </p>
      </div>
      <LinkPendingIcon>
        <ChevronRight
          aria-hidden="true"
          className="size-5 shrink-0 text-slate-400 transition-colors group-hover:text-brand-700"
        />
      </LinkPendingIcon>
    </Link>
  );
}
