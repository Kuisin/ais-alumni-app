import { getLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { avatarSrc } from "@/components/profile/avatar-src";
import { RoleSummary } from "@/components/profile/role-details";
import { Avatar } from "@/components/ui/avatar";
import type { Locale } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import type { PublicCard } from "@/lib/directory";
import { displayName } from "@/lib/format";

/**
 * Public-tier member summary. Callers must only pass members the viewer is
 * allowed to see; `linked={false}` for people whose profile would 404
 * (e.g. hidden minors in family search).
 */
export async function MemberCard({
  member,
  linked = true,
  showPhoto = true,
  actions,
  meta,
}: {
  member: PublicCard;
  linked?: boolean;
  showPhoto?: boolean;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  const locale = (await getLocale()) as Locale;
  const name = displayName(member, locale);
  const alt = member.nameRomaji ? member.nameKanji : null;
  const nameEl = linked ? (
    <Link
      href={`/app/members/${member.id}`}
      className="font-semibold text-slate-900 underline-offset-2 hover:underline"
    >
      {name}
    </Link>
  ) : (
    <span className="font-semibold text-slate-900">{name}</span>
  );
  return (
    <div className="flex h-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <Avatar
        src={showPhoto ? avatarSrc(member.avatarUrl) : null}
        name={name}
        size={48}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate">{nameEl}</p>
        {alt && alt !== name ? (
          <p className="truncate text-sm text-slate-500">{alt}</p>
        ) : null}
        <RoleSummary roles={member.roles} />
        {meta ? (
          <div className="mt-1 text-xs text-slate-500">{meta}</div>
        ) : null}
        {actions ? (
          <div className="mt-2 flex flex-wrap gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
