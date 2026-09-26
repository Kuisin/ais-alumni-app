import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonClass } from "@/components/ui/button";
import { Badge, EmptyState, PageHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import type { Prisma } from "@/generated/prisma/client";
import { AccountState, RoleKey } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { displayName, formatDate } from "@/lib/format";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/members">): Promise<Metadata> {
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
}: PageProps<"/[locale]/admin/members">) {
  const sp = await searchParams;
  const t = await getTranslations("adminMembers");
  const tr = await getTranslations("roles");
  const tc = await getTranslations("common");
  const locale = (await getLocale()) === "en" ? "en" : "ja";

  const q = one(sp.q).slice(0, 200);
  const state = pick(one(sp.state), Object.values(AccountState));
  const role = pick(one(sp.role), Object.values(RoleKey));
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
        { primaryEmail: { contains: q, mode: "insensitive" } },
        { id: q },
      ],
    });
  }
  if (state) and.push({ state });
  if (role) and.push({ roles: { some: { role } } });
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
        roles: { select: { role: true } },
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

  const lineLabel = (u: (typeof page)[number]) =>
    !u.lineUserId
      ? t("line.notLinked")
      : u.lineFollowing
        ? t("line.following")
        : t("line.linkedNotFollowing");
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
        className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        <div className="sm:col-span-2">
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
        <div>
          <label htmlFor="f-state" className="mb-1 block text-sm font-medium">
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
          <label htmlFor="f-role" className="mb-1 block text-sm font-medium">
            {t("filters.role")}
          </label>
          <Select id="f-role" name="role" defaultValue={role ?? ""}>
            <option value="">{t("filters.any")}</option>
            {Object.values(RoleKey).map((r) => (
              <option key={r} value={r}>
                {tr(`role.${r}`)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="f-line" className="mb-1 block text-sm font-medium">
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
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-6">
          <button type="submit" className={buttonClass("primary")}>
            {tc("search")}
          </button>
          {filtered ? (
            <Link href="/admin/members" className={buttonClass("ghost")}>
              {tc("clear")}
            </Link>
          ) : null}
        </div>
      </form>

      <p className="mb-3 text-sm text-slate-600" aria-live="polite">
        {t("resultCount", { count: total })}
      </p>

      {page.length === 0 ? (
        <EmptyState>{t("empty")}</EmptyState>
      ) : (
        <>
          {/* Mobile: cards */}
          <ul className="space-y-3 md:hidden">
            {page.map((u) => (
              <li key={u.id}>
                <Link
                  href={`/admin/members/${u.id}`}
                  className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-700"
                >
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {name(u)}
                    {u.isAdmin ? (
                      <Badge tone="brand">{t("badge.admin")}</Badge>
                    ) : null}
                  </p>
                  <p className="text-sm break-all text-slate-600">
                    {u.primaryEmail ?? "—"}
                  </p>
                  <p className="mt-2 flex flex-wrap gap-1">
                    <Badge tone={stateTone(u.state)}>
                      {tr(`state.${u.state}`)}
                    </Badge>
                    {u.roles.map((r) => (
                      <Badge key={r.role}>{tr(`role.${r.role}`)}</Badge>
                    ))}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {t("columns.line")}: {lineLabel(u)} · {t("columns.created")}
                    : {formatDate(u.createdAt, locale)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          {/* md+: table */}
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full text-sm">
              <caption className="sr-only">{t("title")}</caption>
              <thead className="bg-slate-50 text-left text-xs text-slate-600">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {t("columns.name")}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {t("columns.email")}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {t("columns.state")}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {t("columns.roles")}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {t("columns.line")}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {t("columns.created")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {page.map((u) => (
                  <tr
                    key={u.id}
                    className="border-t border-slate-100 align-top hover:bg-slate-50"
                  >
                    <th scope="row" className="px-3 py-2 text-left font-medium">
                      <Link
                        href={`/admin/members/${u.id}`}
                        className="text-brand-700 underline"
                      >
                        {name(u)}
                      </Link>
                      {u.isAdmin ? (
                        <span className="ml-2">
                          <Badge tone="brand">{t("badge.admin")}</Badge>
                        </span>
                      ) : null}
                    </th>
                    <td className="px-3 py-2 break-all">
                      {u.primaryEmail ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={stateTone(u.state)}>
                        {tr(`state.${u.state}`)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      {u.roles.map((r) => tr(`role.${r.role}`)).join(", ") ||
                        "—"}
                    </td>
                    <td className="px-3 py-2">{lineLabel(u)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatDate(u.createdAt, locale)}
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
            href={{ pathname: "/admin/members", query: baseQuery }}
            className={buttonClass("secondary")}
          >
            {t("firstPage")}
          </Link>
        ) : null}
        {hasMore ? (
          <Link
            href={{
              pathname: "/admin/members",
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
