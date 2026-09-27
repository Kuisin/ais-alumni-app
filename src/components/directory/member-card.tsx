import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { RoleSummary } from "@/components/profile/role-details";
import { Avatar } from "@/components/ui/avatar";
import type { Locale } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import { defaultAvatar, loadConnections, photoFor } from "@/lib/avatar";
import type { PublicCard } from "@/lib/directory";
import { displayName, otherNames } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";

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
  const tp = await getTranslations("profile");
  const viewer = await getCurrentUser();
  const photo =
    showPhoto && viewer
      ? photoFor(await loadConnections(viewer.id), member)
      : defaultAvatar(member.gender);
  const name = displayName(member, locale);
  const alt = otherNames(member);
  const nameEl = linked ? (
    // Stretched link: the whole card opens the profile; buttons in
    // `actions` sit above it and stay clickable on their own.
    <Link
      href={`/app/members/${member.id}`}
      className="font-semibold text-slate-900 underline-offset-2 group-hover:underline after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand-600"
    >
      {name}
    </Link>
  ) : (
    <span className="font-semibold text-slate-900">{name}</span>
  );
  return (
    <div
      className={`relative flex h-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm ${linked ? "group transition-colors hover:border-brand-300 hover:bg-slate-50" : ""}`}
    >
      <Avatar src={photo} name={name} size={48} />
      <div className="min-w-0 flex-1">
        <p className="truncate">{nameEl}</p>
        {alt ? <p className="truncate text-sm text-slate-500">{alt}</p> : null}
        {member.nameAtAis ? (
          <p className="truncate text-xs text-slate-500">
            {tp("nameAtAisValue", { name: member.nameAtAis })}
          </p>
        ) : null}
        <RoleSummary roles={member.roles} />
        {meta ? (
          <div className="mt-1 text-xs text-slate-500">{meta}</div>
        ) : null}
        {actions ? (
          <div className="relative z-10 mt-2 flex flex-wrap gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
