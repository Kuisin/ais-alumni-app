import {
  ArrowLeftRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  ChartColumn,
  ChevronDown,
  FilePen,
  GraduationCap,
  HeartHandshake,
  House,
  IdCard,
  Layers,
  LifeBuoy,
  LogOut,
  MailPlus,
  Megaphone,
  MessageCircle,
  MessagesSquare,
  Newspaper,
  Route,
  ScrollText,
  Settings,
  ShieldCheck,
  TableProperties,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/actions/common";
import { RealtimeProvider } from "@/components/realtime/realtime-provider";
import {
  ChangeRequestStatus,
  FollowStatus,
  VerificationStatus,
} from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import { unreadCounts } from "@/lib/announcements";
import { getStaffAccess } from "@/lib/broadcasts";
import { chatUnreadTotal } from "@/lib/chat-db";
import { db } from "@/lib/db";
import { displayName } from "@/lib/format";
import { hasStaffAccess, type StaffAccess } from "@/lib/permissions";
import { channelTopic } from "@/lib/realtime";
import type { CurrentUser } from "@/lib/session";
import { LocaleSwitcher } from "./locale-switcher";
import { Dropdown, NavLink } from "./nav-link";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  count?: number;
};
type NavGroup = { label: string; items: NavItem[] };

const ICON = "size-4 shrink-0";

/** Small count of waiting items after a nav label. */
function CountBadge({ n, label }: { n?: number; label: string }) {
  if (!n) return null;
  return (
    <span className="ml-auto rounded-full bg-amber-400 px-1.5 text-xs font-semibold text-slate-900 tabular-nums">
      <span aria-hidden="true">{n > 99 ? "99+" : n}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/**
 * Page chrome. Member mode: top nav (bottom tab bar on phones) and an account
 * menu. Admin mode is a separate workspace — dark header, sidebar grouped by
 * task, filtered to what the member may do — with a switch back.
 */
export async function AppShell({
  user,
  children,
  variant = "member",
  help,
}: {
  user: CurrentUser | null;
  children: ReactNode;
  variant?: "member" | "admin" | "onboarding";
  /** header help button (onboarding: 「お問い合わせ」 dialog) */
  help?: ReactNode;
}) {
  const t = await getTranslations("common");
  const locale = (await getLocale()) === "en" ? "en" : "ja";
  const access: StaffAccess | null =
    user && variant !== "onboarding" ? await getStaffAccess(user) : null;
  const isStaff = access ? hasStaffAccess(access) : false;
  const admin = variant === "admin";
  // Badges: work waiting for this person.
  const [
    pendingVerify,
    pendingRecords,
    pendingNames,
    followRequests,
    unread,
    openSupport,
  ] = await Promise.all([
    admin && access?.admin
      ? db.verificationRequest.count({
          where: {
            status: VerificationStatus.PENDING,
            followsChildren: false,
          },
        })
      : 0,
    admin && access?.admin
      ? db.recordChangeRequest.count({
          where: { status: ChangeRequestStatus.PENDING },
        })
      : 0,
    // Name and birth date change requests share one admin page.
    admin && access?.admin
      ? Promise.all([
          db.nameChangeRequest.count({
            where: { status: ChangeRequestStatus.PENDING },
          }),
          db.birthDateRequest.count({
            where: { status: ChangeRequestStatus.PENDING },
          }),
          db.genderRequest.count({
            where: { status: ChangeRequestStatus.PENDING },
          }),
        ]).then(([a, b, c]) => a + b + c)
      : 0,
    variant === "member" && user
      ? db.follow.count({
          where: { followeeId: user.id, status: FollowStatus.REQUESTED },
        })
      : 0,
    variant === "member" && user
      ? unreadCounts(user)
      : { news: 0, messages: 0 },
    admin && access?.admin
      ? db.supportRequest.count({ where: { closedAt: null } })
      : 0,
  ]);
  const unreadTotal = unread.news + unread.messages;
  // Group chats: unread badge and the channels joined for live updates.
  const live = user && user.state === "ACTIVE" && variant !== "onboarding";
  const [chatUnread, chatGroups] = live
    ? await Promise.all([
        variant === "member" ? chatUnreadTotal(user.id) : 0,
        db.chatMember.findMany({
          where: { userId: user.id },
          select: { groupId: true },
        }),
      ])
    : [0, []];
  const realtimeTopics = live
    ? [
        channelTopic("user", user.id),
        ...chatGroups.map((g) => channelTopic("chat", g.groupId)),
      ]
    : [];
  const withRealtime = (node: ReactNode) =>
    live ? (
      <RealtimeProvider topics={realtimeTopics}>{node}</RealtimeProvider>
    ) : (
      node
    );

  const primary: NavItem[] = [
    {
      href: "/app/dashboard",
      label: t("nav.dashboard"),
      icon: <House className={ICON} />,
    },
    {
      href: "/app/directory",
      label: t("nav.directory"),
      icon: <Users className={ICON} />,
    },
    {
      href: "/app/events",
      label: t("nav.events"),
      icon: <CalendarDays className={ICON} />,
    },
    {
      href: "/app/news",
      label: t("nav.news"),
      count: unreadTotal,
      icon: <Newspaper className={ICON} />,
    },
    {
      href: "/app/chat",
      label: t("nav.chat"),
      count: chatUnread,
      icon: <MessagesSquare className={ICON} />,
    },
    {
      href: "/app/family",
      label: t("nav.family"),
      icon: <HeartHandshake className={ICON} />,
    },
  ];
  const accountItems: NavItem[] = [
    {
      href: "/app/profile",
      label: t("nav.profile"),
      icon: <UserRound className={ICON} />,
    },
    {
      href: "/app/follows",
      label: t("nav.follows"),
      count: followRequests,
      icon: <UserPlus className={ICON} />,
    },
    {
      href: "/app/invite",
      label: t("nav.invite"),
      icon: <MailPlus className={ICON} />,
    },
    {
      href: "/app/settings",
      label: t("nav.settings"),
      icon: <Settings className={ICON} />,
    },
    {
      href: "/support",
      label: t("nav.support"),
      icon: <LifeBuoy className={ICON} />,
    },
  ];

  const a = access ?? { admin: false, broadcast: false, teachers: false };
  const adminGroups: NavGroup[] = [
    {
      label: t("adminGroups.review"),
      items: a.admin
        ? [
            {
              href: "/app/admin/verification",
              label: t("adminNav.verification"),
              count: pendingVerify,
              icon: <BadgeCheck className={ICON} />,
            },
            {
              href: "/app/admin/record-requests",
              label: t("adminNav.recordRequests"),
              count: pendingRecords,
              icon: <FilePen className={ICON} />,
            },
            {
              href: "/app/admin/name-requests",
              label: t("adminNav.nameRequests"),
              count: pendingNames,
              icon: <IdCard className={ICON} />,
            },
            {
              href: "/app/admin/support",
              label: t("adminNav.support"),
              count: openSupport,
              icon: <LifeBuoy className={ICON} />,
            },
          ]
        : [],
    },
    {
      label: t("adminGroups.people"),
      items: [
        ...(a.admin
          ? [
              {
                href: "/app/admin/members",
                label: t("adminNav.members"),
                icon: <Users className={ICON} />,
              },
            ]
          : []),
        ...(a.teachers
          ? [
              {
                href: "/app/admin/teachers",
                label: t("adminNav.teachers"),
                icon: <UserCheck className={ICON} />,
              },
            ]
          : []),
        ...(a.admin
          ? [
              {
                href: "/app/admin/cohorts",
                label: t("adminNav.cohorts"),
                icon: <Layers className={ICON} />,
              },
            ]
          : []),
      ],
    },
    {
      label: t("adminGroups.outreach"),
      items: [
        ...(a.broadcast
          ? [
              {
                href: "/app/admin/notify",
                label: t("nav.notify"),
                icon: <Megaphone className={ICON} />,
              },
            ]
          : []),
        ...(a.admin
          ? [
              {
                href: "/app/admin/events",
                label: t("adminNav.events"),
                icon: <CalendarDays className={ICON} />,
              },
              {
                href: "/app/admin/news",
                label: t("adminNav.news"),
                icon: <Newspaper className={ICON} />,
              },
              {
                href: "/app/admin/line",
                label: t("adminNav.line"),
                icon: <MessageCircle className={ICON} />,
              },
            ]
          : []),
      ],
    },
    {
      label: t("adminGroups.data"),
      items: a.admin
        ? [
            {
              href: "/app/admin/destinations",
              label: t("adminNav.destinations"),
              icon: <Route className={ICON} />,
            },
            {
              href: "/app/admin/stats",
              label: t("adminNav.stats"),
              icon: <ChartColumn className={ICON} />,
            },
            {
              href: "/app/admin/organizations",
              label: t("adminNav.organizations"),
              icon: <Building2 className={ICON} />,
            },
            {
              href: "/app/admin/roster",
              label: t("adminNav.roster"),
              icon: <TableProperties className={ICON} />,
            },
            {
              href: "/app/admin/audit",
              label: t("adminNav.audit"),
              icon: <ScrollText className={ICON} />,
            },
          ]
        : [],
    },
  ].filter((g) => g.items.length > 0);

  const switchLink = admin ? (
    <Link
      href="/app/dashboard"
      aria-label={t("nav.memberMode")}
      className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-white hover:bg-white/10"
    >
      <ArrowLeftRight aria-hidden="true" className={ICON} />
      <span className="whitespace-nowrap sm:hidden">
        {t("nav.memberModeShort")}
      </span>
      <span className="hidden sm:inline">{t("nav.memberMode")}</span>
    </Link>
  ) : isStaff ? (
    <Link
      href="/app/admin"
      aria-label={t("nav.adminMode")}
      className="flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-brand-800 sm:gap-2 sm:px-3 hover:bg-brand-50"
    >
      <ShieldCheck aria-hidden="true" className={ICON} />
      <span className="whitespace-nowrap sm:hidden">
        {t("nav.adminModeShort")}
      </span>
      <span className="hidden sm:inline">{t("nav.adminMode")}</span>
    </Link>
  ) : null;

  const accountMenu = user ? (
    <Dropdown
      summaryClassName={`relative flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium ${admin ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-slate-100"}`}
      summary={
        <>
          <span
            aria-hidden="true"
            className="inline-flex size-8 items-center justify-center rounded-full bg-brand-100 text-brand-800"
          >
            <UserRound className={ICON} />
          </span>
          {followRequests > 0 ? (
            <span
              aria-hidden="true"
              className="absolute top-2 left-8 size-2.5 rounded-full bg-red-600 ring-2 ring-white"
            />
          ) : null}
          <span className="sr-only">
            {t("nav.account")}
            {followRequests > 0
              ? ` (${t("nav.pending", { count: followRequests })})`
              : ""}
          </span>
          <ChevronDown aria-hidden="true" className="size-4" />
        </>
      }
    >
      <p className="truncate px-3 py-2 text-xs text-slate-500">
        {displayName(user, locale)}
      </p>
      {variant === "member" ? (
        <ul>
          {[
            ...primary
              .filter((i) => i.href === "/app/family")
              .map((i) => ({ ...i, mobileOnly: true })),
            ...accountItems.map((i) => ({ ...i, mobileOnly: false })),
          ].map((item) => (
            <li
              key={item.href}
              className={item.mobileOnly ? "lg:hidden" : undefined}
            >
              <NavLink
                href={item.href}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-slate-100"
                activeClassName="bg-brand-50 text-brand-800"
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
                <CountBadge
                  n={item.count}
                  label={t("nav.pending", { count: item.count ?? 0 })}
                />
              </NavLink>
            </li>
          ))}
          {isStaff ? (
            <li>
              <Link
                href="/app/admin"
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-slate-100"
              >
                <ShieldCheck aria-hidden="true" className={ICON} />
                {t("nav.adminMode")}
              </Link>
            </li>
          ) : null}
        </ul>
      ) : null}
      <form
        action={signOutAction}
        className="mt-1 border-t border-slate-100 pt-1"
      >
        <button
          type="submit"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-slate-100"
        >
          <LogOut aria-hidden="true" className={ICON} />
          {t("signOut")}
        </button>
      </form>
    </Dropdown>
  ) : null;

  const footer = (
    <footer
      className={`border-t border-slate-200 bg-white px-4 pt-4 text-xs text-slate-500 ${variant === "member" ? "pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-4 max-lg:standalone:pb-[calc(5rem+env(safe-area-inset-bottom))]" : "pb-[calc(1rem+env(safe-area-inset-bottom))] standalone:pb-[calc(1.5rem+env(safe-area-inset-bottom))]"}`}
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-balance">
        <Link href="/privacy" className="inline-block py-2 underline">
          {t("privacy")}
        </Link>
        <Link href="/support" className="inline-block py-2 underline">
          {t("support")}
        </Link>
        {/* Members change language in 設定; visitors and applicants here. */}
        {variant === "onboarding" ? <LocaleSwitcher compact /> : null}
        <span>{t("footer")}</span>
      </div>
    </footer>
  );

  if (admin) {
    return withRealtime(
      <>
        <header className="sticky top-0 z-40 bg-slate-900 pt-[env(safe-area-inset-top)] text-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2">
            <Link
              href="/app/admin"
              className="flex min-h-11 items-center gap-2 font-bold"
            >
              <span
                aria-hidden="true"
                className="inline-flex size-8 items-center justify-center rounded-lg bg-amber-400 text-slate-900"
              >
                <ShieldCheck className="size-5" />
              </span>
              <span className="whitespace-nowrap max-sm:sr-only">
                {t("nav.adminMode")}
              </span>
            </Link>
            <div className="flex items-center gap-1">
              {switchLink}
              {accountMenu}
            </div>
          </div>
        </header>
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 lg:flex-row">
          <nav aria-label={t("nav.adminLabel")} className="lg:w-56 lg:shrink-0">
            <div className="relative -mx-4 flex snap-x gap-1 overflow-x-auto px-4 pb-1 [mask-image:linear-gradient(to_right,black_88%,transparent)] lg:sticky lg:[mask-image:none] lg:top-20 lg:mx-0 lg:block lg:space-y-5 lg:overflow-visible lg:px-0">
              {adminGroups.map((g) => (
                <div key={g.label} className="contents lg:block">
                  <p className="hidden px-3 pb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase lg:block">
                    {g.label}
                  </p>
                  <ul className="contents lg:block lg:space-y-0.5">
                    {g.items.map((item) => (
                      <li key={item.href} className="shrink-0 snap-start">
                        <NavLink
                          href={item.href}
                          scrollIntoViewIfActive
                          className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium whitespace-nowrap text-slate-700 hover:bg-slate-100 lg:min-h-9"
                          activeClassName="bg-slate-900 text-white hover:bg-slate-800"
                        >
                          <span aria-hidden="true">{item.icon}</span>
                          {item.label}
                          <CountBadge
                            n={item.count}
                            label={t("nav.pending", { count: item.count ?? 0 })}
                          />
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </nav>
          <main id="main" className="min-w-0 flex-1">
            {children}
          </main>
        </div>
        {footer}
      </>,
    );
  }

  return withRealtime(
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2">
          <Link
            href={variant === "member" ? "/app/dashboard" : "/"}
            className="flex min-h-11 items-center gap-2 font-bold text-brand-800"
          >
            <span
              aria-hidden="true"
              className="inline-flex size-8 items-center justify-center rounded-lg bg-brand-700 text-sm text-white"
            >
              <GraduationCap className="size-5" />
            </span>
            <span className="hidden sm:inline">{t("appNameShort")}</span>
          </Link>

          {variant === "member" ? (
            <nav
              aria-label={t("nav.label")}
              className="hidden flex-1 justify-center lg:flex"
            >
              <ul className="flex gap-1">
                {primary.map((item) => (
                  <li key={item.href}>
                    <NavLink
                      href={item.href}
                      className="flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      activeClassName="bg-brand-50 text-brand-800"
                    >
                      <span aria-hidden="true">{item.icon}</span>
                      {item.label}
                      <CountBadge
                        n={item.count}
                        label={t("nav.unread", { count: item.count ?? 0 })}
                      />
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          <div className="flex items-center gap-1">
            {help}
            {switchLink}
            {accountMenu}
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </main>
      {footer}
      {variant === "member" ? (
        <nav
          aria-label={t("nav.label")}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur standalone:pb-[max(env(safe-area-inset-bottom),0.5rem)] lg:hidden"
        >
          <ul className="mx-auto grid max-w-lg grid-cols-6">
            {[
              ...primary.slice(0, 5),
              { ...accountItems[0], label: t("nav.profileShort") },
            ].map((item) => (
              <li key={item.href}>
                <NavLink
                  href={item.href}
                  className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-slate-600 [&_svg]:size-5"
                  activeClassName="text-brand-700"
                >
                  <span className="relative">
                    <span aria-hidden="true">{item.icon}</span>
                    {item.count ? (
                      <span
                        aria-hidden="true"
                        className="absolute -top-1.5 left-3.5 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] leading-4 font-semibold text-white tabular-nums ring-2 ring-white"
                      >
                        {item.count > 99 ? "99+" : item.count}
                      </span>
                    ) : null}
                  </span>
                  {item.label}
                  {item.count ? (
                    <span className="sr-only">
                      {` (${t("nav.unread", { count: item.count })})`}
                    </span>
                  ) : null}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </>,
  );
}
