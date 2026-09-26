import { Search, ShieldOff, Users } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import {
  acceptFollowAction,
  declineFollowAction,
  removeFollowerAction,
  unblockAction,
  unfollowAction,
} from "@/app/actions/follows";
import { MemberCard } from "@/components/directory/member-card";
import { buttonClass } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Locale } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import { loadFollowLists } from "@/lib/follows";
import { formatDate } from "@/lib/format";
import { requireActive } from "@/lib/session";

const TABS = [
  "incoming",
  "outgoing",
  "followers",
  "following",
  "blocked",
] as const;
type Tab = (typeof TABS)[number];

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("follows");
  return { title: t("title") };
}

function ActionForm({
  action,
  name,
  value,
  children,
  variant = "secondary",
}: {
  action: (fd: FormData) => Promise<void>;
  name: string;
  value: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
}) {
  return (
    <form action={action}>
      <input type="hidden" name={name} value={value} />
      <SubmitButton variant={variant}>{children}</SubmitButton>
    </form>
  );
}

/** Follow requests, followers, following and blocked members (§9.2). */
export default async function FollowsPage({ searchParams }: Props) {
  const me = await requireActive();
  const t = await getTranslations("follows");
  const locale = (await getLocale()) as Locale;
  const sp = await searchParams;
  const raw = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const tab: Tab = TABS.includes(raw as Tab) ? (raw as Tab) : "incoming";
  const lists = await loadFollowLists(me.id);

  const counts: Record<Tab, number> = {
    incoming: lists.incoming.length,
    outgoing: lists.outgoing.length,
    followers: lists.followers.length,
    following: lists.following.length,
    blocked: lists.blocked.length,
  };

  const row = (key: string, node: ReactNode) => <li key={key}>{node}</li>;
  let content: ReactNode[] = [];
  switch (tab) {
    case "incoming":
      content = lists.incoming.map((f) =>
        row(
          f.id,
          <MemberCard
            member={f.follower}
            meta={t("requestedAt", { date: formatDate(f.createdAt, locale) })}
            actions={
              <>
                <ActionForm
                  action={acceptFollowAction}
                  name="followId"
                  value={f.id}
                  variant="primary"
                >
                  {t("actions.accept")}
                </ActionForm>
                <ActionForm
                  action={declineFollowAction}
                  name="followId"
                  value={f.id}
                >
                  {t("actions.decline")}
                </ActionForm>
              </>
            }
          />,
        ),
      );
      break;
    case "outgoing":
      content = lists.outgoing.map((f) =>
        row(
          f.id,
          <MemberCard
            member={f.followee}
            meta={t("requestedAt", { date: formatDate(f.createdAt, locale) })}
            actions={
              <ActionForm
                action={unfollowAction}
                name="targetId"
                value={f.followee.id}
              >
                {t("actions.cancelRequest")}
              </ActionForm>
            }
          />,
        ),
      );
      break;
    case "followers":
      content = lists.followers.map((f) =>
        row(
          f.id,
          <MemberCard
            member={f.follower}
            actions={
              <ActionForm
                action={removeFollowerAction}
                name="followerId"
                value={f.follower.id}
              >
                {t("actions.remove")}
              </ActionForm>
            }
          />,
        ),
      );
      break;
    case "following":
      content = lists.following.map((f) =>
        row(
          f.id,
          <MemberCard
            member={f.followee}
            actions={
              <ActionForm
                action={unfollowAction}
                name="targetId"
                value={f.followee.id}
              >
                {t("actions.unfollow")}
              </ActionForm>
            }
          />,
        ),
      );
      break;
    case "blocked":
      // Blocked members' profiles are hidden, so no profile link or photo.
      content = lists.blocked.map((b) =>
        row(
          b.id,
          <MemberCard
            member={b.blocked}
            linked={false}
            showPhoto={false}
            actions={
              <ActionForm
                action={unblockAction}
                name="targetId"
                value={b.blocked.id}
              >
                {t("actions.unblock")}
              </ActionForm>
            }
          />,
        ),
      );
      break;
  }

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <nav aria-label={t("tabsLabel")} className="mb-4">
        <ul className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {TABS.map((key) => (
            <li key={key}>
              <Link
                href={`/app/follows?tab=${key}`}
                aria-current={key === tab ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center justify-between gap-2 whitespace-nowrap rounded-lg border px-3 text-sm font-medium transition-colors sm:justify-center",
                  key === tab
                    ? "border-brand-700 bg-brand-50 text-brand-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
                )}
              >
                {t(`tabs.${key}`)}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs",
                    key === tab
                      ? "bg-brand-100 text-brand-800"
                      : "bg-slate-100 text-slate-700",
                  )}
                >
                  {counts[key]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <section aria-labelledby="follows-list-title">
        <h2 id="follows-list-title" className="sr-only">
          {t(`tabs.${tab}`)}
        </h2>
        {content.length === 0 ? (
          <EmptyState
            icon={tab === "blocked" ? <ShieldOff /> : <Users />}
            action={
              tab === "blocked" ? undefined : (
                <Link href="/app/directory" className={buttonClass("primary")}>
                  <Search aria-hidden="true" className="size-4" />
                  {t("findInDirectory")}
                </Link>
              )
            }
          >
            <span className="text-balance">{t(`empty.${tab}`)}</span>
          </EmptyState>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">{content}</ul>
        )}
      </section>
    </>
  );
}
