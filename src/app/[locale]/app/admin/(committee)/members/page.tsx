import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { formatCompactDate } from "@/components/admin/admin-format";
import { buttonClass } from "@/components/ui/button";
import { Badge, EmptyState, PageHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import type { Prisma } from "@/generated/prisma/client";
import { AccountState, type RoleKey } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import {
  AUDIENCE_KEYS,
  parseMemberFilter,
  roleLabelKey,
  roleRowWhere,
} from "@/lib/audience";
import { db } from "@/lib/db";
import { displayName } from "@/lib/format";
import { toKatakana } from "@/lib/names";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/admin/members">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminMembers" });
  return { title: t("title") };
}

const PAGE_SIZE = 25;
const LINE_FILTERS = ["linked", "following", "unlinked"] as const;
type LineFilter = (typeof LINE_FILTERS)[number];

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

function pick<T extends string>(
  value: string,
  allowed: readonly T[],
): T | null {
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

export default async function AdminMembersPage({
  searchParams,
}: PageProps<"/[locale]/app/admin/members">) {
  const sp = await searchParams;
  const t = await getTranslations("adminMembers");
  const tr = await getTranslations("roles");
  // "教職員（元教職員）" for former teachers, so status is visible in the list.
  const roleLabel = (r: {
    role: RoleKey;
    teacherStatus: string | null;
    didGraduate: boolean | null;
  }) =>
    r.role === "TEACHER" && r.teacherStatus === "FORMER"
      ? `${tr("role.TEACHER")}（${tr("teacherStatusShort.FORMER")}）`
      : tr(roleLabelKey(r));
  const tc = await getTranslations("common");
  const locale = (await getLocale()) === "en" ? "en" : "ja";

  const q = one(sp.q).slice(0, 200);
  const state = pick(one(sp.state), Object.values(AccountState));
  const role = parseMemberFilter(one(sp.role));
  const line = pick<LineFilter>(one(sp.line), LINE_FILTERS);
  const adminOnly = one(sp.admin) === "1";
  const cursor = one(sp.cursor) || null;

  const and: Prisma.UserWhereInput[] = [];
  if (q) {
    and.push({
      OR: [
        { nameRomaji: { contains: q, mode: "insensitive" } },
        { nameKanji: { contains: q, mode: "insensitive" } },
        { nameAtAis: { contains: q, mode: "insensitive" } },
        { nameKana: { contains: toKatakana(q) } },
        { primaryEmail: { contains: q, mode: "insensitive" } },
        { id: q },
      ],
    });
  }
  if (state) and.push({ state });
  if (role) and.push({ roles: { some: roleRowWhere(role) } });
  if (line === "linked") and.push({ lineUserId: { not: null } });
  if (line === "following")
    and.push({ lineUserId: { not: null }, lineFollowing: true });
  if (line === "unlinked") and.push({ lineUserId: null });
  if (adminOnly) and.push({ isAdmin: true });
  const where: Prisma.UserWhereInput = and.length ? { AND: and } : {};

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        nameRomaji: true,
        nameKanji: true,
        primaryEmail: true,
        state: true,
        isAdmin: true,
        lineUserId: true,
        lineFollowing: true,
        createdAt: true,
        roles: {
          select: { role: true, teacherStatus: true, didGraduate: true },
        },
      },
    }),
    db.user.count({ where }),
  ]);
  const hasMore = users.length > PAGE_SIZE;
  const page = users.slice(0, PAGE_SIZE);

  const baseQuery: Record<string, string> = {};
  if (q) baseQuery.q = q;
  if (state) baseQuery.state = state;
  if (role) baseQuery.role = role;
  if (line) baseQuery.line = line;
  if (adminOnly) baseQuery.admin = "1";
  const filtered = Object.keys(baseQuery).length > 0;
  const secondaryCount = [state, role, line, adminOnly].filter(Boolean).length;

  const lineLabel = (u: (typeof page)[number]) =>
    !u.lineUserId
      ? t("line.notLinked")
      : u.lineFollowing
        ? t("line.following")
        : t("line.linkedNotFollowing");
  const lineDot = (u: (typeof page)[number]) =>
    !u.lineUserId
      ? "bg-slate-300"
      : u.lineFollowing
        ? "bg-green-600"
        : "bg-amber-500";
  const lineShort = (u: (typeof page)[number]) =>
    !u.lineUserId
      ? t("line.short.notLinked")
      : u.lineFollowing
        ? t("line.short.following")
        : t("line.short.linkedNotFollowing");
  const stateTone = (s: AccountState) =>
    s === "ACTIVE"
      ? "green"
      : s === "DEACTIVATED" || s === "REJECTED"
        ? "red"
        : "amber";
  const name = (u: (typeof page)[number]) =>
    u.nameRomaji || u.nameKanji ? displayName(u, locale) : t("noName");

  return (
    <div>
      <PageHeader title={t("title")} description={t("description")} />

      {/* Plain GET form: filters live in the URL so results are linkable. */}
      <form
        method="get"
        aria-label={t("filters.label")}
        className="mb-6 space-y-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="f-q" className="mb-1 block text-sm font-medium">
              {t("filters.search")}
            </label>
            <Input
              id="f-q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder={t("filters.searchPlaceholder")}
            />
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="submit"
              className={buttonClass("primary", "whitespace-nowrap")}
            >
              <Search aria-hidden="true" className="size-4" />
              {tc("search")}
            </button>
            {filtered ? (
              <Link
                href="/app/admin/members"
                className={buttonClass("ghost", "whitespace-nowrap")}
              >
                {tc("clear")}
              </Link>
            ) : null}
          </div>
        </div>
        {/* Secondary filters fold away; open when one of them is in use. */}
        <details open={secondaryCount > 0} className="group">
          <summary className="-mx-2 inline-flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-lg px-2 text-sm font-medium text-brand-700 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
            <SlidersHorizontal aria-hidden="true" className="size-4" />
            {t("filters.more")}
            {secondaryCount > 0 ? (
              <Badge tone="brand">
                {t("filters.activeCount", { count: secondaryCount })}
              </Badge>
            ) : null}
            <ChevronDown
              aria-hidden="true"
              className="size-4 transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label
                htmlFor="f-state"
                className="mb-1 block text-sm font-medium"
              >
                {t("filters.state")}
              </label>
              <Select id="f-state" name="state" defaultValue={state ?? ""}>
                <option value="">{t("filters.any")}</option>
                {Object.values(AccountState).map((s) => (
                  <option key={s} value={s}>
                    {tr(`state.${s}`)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label
                htmlFor="f-role"
                className="mb-1 block text-sm font-medium"
              >
                {t("filters.role")}
              </label>
              <Select id="f-role" name="role" defaultValue={role ?? ""}>
                <option value="">{t("filters.any")}</option>
                {AUDIENCE_KEYS.map((r) => (
                  <option key={r} value={r}>
                    {tr(`audience.${r}`)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label
                htmlFor="f-line"
                className="mb-1 block text-sm font-medium"
              >
                {t("filters.line")}
              </label>
              <Select id="f-line" name="line" defaultValue={line ?? ""}>
                <option value="">{t("filters.any")}</option>
                <option value="linked">{t("filters.lineLinked")}</option>
                <option value="following">{t("filters.lineFollowing")}</option>
                <option value="unlinked">{t("filters.lineUnlinked")}</option>
              </Select>
            </div>
            <div className="flex items-end">
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="admin"
                  value="1"
                  defaultChecked={adminOnly}
                  className="size-5"
                />
                {t("filters.adminOnly")}
              </label>
            </div>
          </div>
        </details>
      </form>

      <p className="mb-3 text-sm text-slate-600" aria-live="polite">
        {t("resultCount", { count: total })}
      </p>

      {page.length === 0 ? (
        <EmptyState>{t("empty")}</EmptyState>
      ) : (
        <>
          {/* Phones and tablets: cards (two columns from md) */}
          <ul className="grid gap-3 md:grid-cols-2 lg:hidden">
            {page.map((u) => (
              <li key={u.id}>
                <Link
                  href={`/app/admin/members/${u.id}`}
                  className="block h-full rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:border-brand-700 hover:shadow-sm"
                >
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {name(u)}
                    {u.isAdmin ? (
                      <Badge tone="brand">{t("badge.admin")}</Badge>
                    ) : null}
                  </p>
                  <p
                    className="truncate text-sm text-slate-600"
                    title={u.primaryEmail ?? undefined}
                  >
                    {u.primaryEmail ?? "—"}
                  </p>
                  <p className="mt-2 flex flex-wrap gap-1 [&>span]:whitespace-nowrap">
                    <Badge tone={stateTone(u.state)}>
                      {tr(`state.${u.state}`)}
                    </Badge>
                    {u.roles.map((r) => (
                      <Badge key={r.role}>{roleLabel(r)}</Badge>
                    ))}
                  </p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <span
                        aria-hidden="true"
                        className={`size-2 rounded-full ${lineDot(u)}`}
                      />
                      {t("columns.line")}: {lineLabel(u)}
                    </span>
                    <span className="whitespace-nowrap tabular-nums">
                      {t("columns.created")}:{" "}
                      {formatCompactDate(u.createdAt, locale)}
                    </span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          {/* lg+: table */}
          <div className="relative hidden overflow-x-auto rounded-xl border border-slate-200 bg-white lg:block">
            <table className="w-full text-sm">
              <caption className="sr-only">{t("title")}</caption>
              <thead className="bg-slate-50 text-left text-xs text-slate-600">
                <tr>
                  <th
                    scope="col"
                    className="px-3 py-2 font-medium whitespace-nowrap"
                  >
                    {t("columns.name")}
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 font-medium whitespace-nowrap"
                  >
                    {t("columns.state")}
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 font-medium whitespace-nowrap"
                  >
                    {t("columns.roles")}
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 font-medium whitespace-nowrap"
                  >
                    {t("columns.line")}
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-2 font-medium whitespace-nowrap xl:table-cell"
                  >
                    {t("columns.created")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {page.map((u) => (
                  <tr
                    key={u.id}
                    className="border-t border-slate-100 align-middle hover:bg-slate-50"
                  >
                    <th scope="row" className="px-3 py-2 text-left font-medium">
                      <Link
                        href={`/app/admin/members/${u.id}`}
                        className="text-brand-700 hover:underline"
                      >
                        {name(u)}
                      </Link>
                      {u.isAdmin ? (
                        <span className="ml-2 whitespace-nowrap">
                          <Badge tone="brand">{t("badge.admin")}</Badge>
                        </span>
                      ) : null}
                      <span
                        className="block max-w-[18rem] truncate text-xs font-normal text-slate-500"
                        title={u.primaryEmail ?? undefined}
                      >
                        <span className="sr-only">{t("columns.email")}: </span>
                        {u.primaryEmail ?? "—"}
                      </span>
                    </th>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <Badge tone={stateTone(u.state)}>
                        {tr(`state.${u.state}`)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      {u.roles.length ? (
                        <span className="flex flex-wrap gap-1 [&>span]:whitespace-nowrap">
                          {u.roles.map((r) => (
                            <Badge key={r.role}>{roleLabel(r)}</Badge>
                          ))}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className="inline-flex items-center gap-1.5"
                        title={lineLabel(u)}
                      >
                        <span
                          aria-hidden="true"
                          className={`size-2 shrink-0 rounded-full ${lineDot(u)}`}
                        />
                        <span aria-hidden="true">{lineShort(u)}</span>
                        <span className="sr-only">{lineLabel(u)}</span>
                      </span>
                    </td>
                    <td className="hidden px-3 py-2 whitespace-nowrap tabular-nums xl:table-cell">
                      <time dateTime={u.createdAt.toISOString()}>
                        {formatCompactDate(u.createdAt, locale)}
                      </time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <nav aria-label={t("pagination")} className="mt-4 flex flex-wrap gap-2">
        {cursor ? (
          <Link
            href={{ pathname: "/app/admin/members", query: baseQuery }}
            className={buttonClass("secondary")}
          >
            {t("firstPage")}
          </Link>
        ) : null}
        {hasMore ? (
          <Link
            href={{
              pathname: "/app/admin/members",
              query: { ...baseQuery, cursor: page[page.length - 1].id },
            }}
            className={buttonClass("secondary")}
          >
            {t("nextPage")}
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
