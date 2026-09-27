import { Users } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  ChatMemberList,
  type ChatMemberRow,
} from "@/components/chat/chat-member-list";
import { Avatar } from "@/components/ui/avatar";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { blockedUserIds, canViewProfile, toViewer } from "@/lib/authz";
import { loadConnections, photoFor } from "@/lib/avatar";
import { chatGroupName } from "@/lib/chat-labels";
import { loadChatGroup } from "@/lib/chat-room";
import { db } from "@/lib/db";
import { asLocale } from "@/lib/events";
import { otherNames } from "@/lib/format";
import { requireActive } from "@/lib/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/chat/[id]/info">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "chat.info" });
  return { title: t("title") };
}

/**
 * A talk's details (like LINE's room info): name, what the group is and
 * its members. Members link to their profiles where the viewer may see
 * them (hidden minors are listed without a link).
 */
export default async function ChatInfoPage({
  params,
}: PageProps<"/[locale]/app/chat/[id]/info">) {
  const { id, locale: raw } = await params;
  const locale = asLocale(raw);
  const user = await requireActive();
  const found = await loadChatGroup(id, user);
  if (!found) notFound();
  const { group, direct } = found;
  const t = await getTranslations("chat");

  const ids = group.members.map((m) => m.user.id);
  const [conn, access, blocked] = await Promise.all([
    loadConnections(user.id),
    db.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        state: true,
        dateOfBirth: true,
        familyId: true,
        managedById: true,
        roles: { select: { role: true } },
      },
    }),
    blockedUserIds(user.id),
  ]);
  const byId = new Map(access.map((a) => [a.id, a]));
  const blockedSet = new Set(blocked);
  const viewer = toViewer(user);
  const members: ChatMemberRow[] = group.members.map(({ user: u }) => {
    const a = byId.get(u.id);
    const linked =
      u.id === user.id ||
      (a
        ? canViewProfile(
            viewer,
            {
              id: a.id,
              state: a.state,
              roles: a.roles.map((r) => r.role),
              dateOfBirth: a.dateOfBirth,
              familyId: a.familyId,
              managed: a.managedById !== null,
            },
            { follow: null, blocked: blockedSet.has(u.id) },
          )
        : false);
    return {
      id: u.id,
      name: u.nameRomaji ?? u.nameKanji ?? "—",
      otherNames: otherNames(u),
      avatar: photoFor(conn, u),
      cohort: u.roles[0]?.cohort?.number ?? null,
      rep: u.positions.length > 0,
      self: u.id === user.id,
      linked,
    };
  });
  // You first, then everyone by name (as loaded).
  members.sort((a, b) => Number(b.self) - Number(a.self));
  const partner = direct ? members.find((m) => !m.self) : null;
  const title = direct
    ? (partner?.name ?? "—")
    : chatGroupName(t, group, locale);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <BackLink href={`/app/chat/${group.id}`}>{t("info.back")}</BackLink>
      <Card className="flex flex-col items-center gap-3 text-center">
        {partner ? (
          <Avatar src={partner.avatar} name={partner.name} size={88} />
        ) : (
          <span
            aria-hidden="true"
            className="inline-flex size-20 items-center justify-center rounded-full bg-brand-50 text-brand-700"
          >
            <Users className="size-9" />
          </span>
        )}
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {direct
              ? t("direct")
              : t.has(`groupHints.${group.kind}`)
                ? t(`groupHints.${group.kind}`)
                : null}
          </p>
        </div>
      </Card>
      <section aria-labelledby="chat-members" className="space-y-2">
        <h2 id="chat-members" className="text-lg font-semibold">
          {t("members", { count: group._count.members })}
        </h2>
        <ChatMemberList members={members} />
      </section>
    </div>
  );
}
