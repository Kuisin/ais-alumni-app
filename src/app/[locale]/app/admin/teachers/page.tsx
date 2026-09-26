import { GraduationCap, Search, UserMinus, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import {
  assignTeacherAction,
  unassignTeacherAction,
} from "@/app/actions/teachers";
import { Avatar } from "@/components/ui/avatar";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { AccountState, RoleKey, TeacherStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { displayName } from "@/lib/format";
import { requireTeacherRegistrar } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("teachers");
  return { title: t("title") };
}

const PERSON = {
  id: true,
  nameRomaji: true,
  nameKanji: true,
} as const;

/**
 * Current teachers (現職), managed by admins and 教職員登録担当. Being a
 * current teacher unlocks access to children's profiles, so every change
 * is audited.
 */
export default async function TeachersPage({
  searchParams,
}: PageProps<"/[locale]/app/admin/teachers">) {
  await requireTeacherRegistrar();
  const t = await getTranslations("teachers");
  const locale = (await getLocale()) === "en" ? "en" : "ja";
  const raw = (await searchParams).q;
  const q = (typeof raw === "string" ? raw : "").trim().slice(0, 60);

  const isCurrent = {
    role: RoleKey.TEACHER,
    NOT: { teacherStatus: TeacherStatus.FORMER },
  };
  const [current, results] = await Promise.all([
    db.user.findMany({
      where: { state: AccountState.ACTIVE, roles: { some: isCurrent } },
      select: {
        ...PERSON,
        roles: {
          where: { role: RoleKey.TEACHER },
          select: { yearsFrom: true, subjects: true },
        },
      },
      orderBy: { nameRomaji: "asc" },
    }),
    q
      ? db.user.findMany({
          where: {
            state: AccountState.ACTIVE,
            NOT: { roles: { some: isCurrent } },
            OR: [
              { nameRomaji: { contains: q, mode: "insensitive" } },
              { nameKanji: { contains: q } },
            ],
          },
          select: {
            ...PERSON,
            roles: { select: { role: true } },
          },
          take: 20,
          orderBy: { nameRomaji: "asc" },
        })
      : Promise.resolve([]),
  ]);
  const tr = await getTranslations("roles");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <Card className="space-y-4" role="region" aria-labelledby="teachers-add">
        <h2
          id="teachers-add"
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <UserPlus aria-hidden="true" className="size-5 text-brand-700" />
          {t("add.title")}
        </h2>
        <form className="flex gap-2">
          <label htmlFor="teacher-q" className="sr-only">
            {t("add.search")}
          </label>
          <Input
            id="teacher-q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder={t("add.placeholder")}
          />
          <SubmitButton variant="secondary" className="shrink-0">
            <Search aria-hidden="true" className="size-4" />
            {t("add.search")}
          </SubmitButton>
        </form>
        {q ? (
          results.length ? (
            <ul className="divide-y divide-slate-100">
              {results.map((u) => (
                <li
                  key={u.id}
                  className="animate-rise flex items-center gap-3 py-3"
                >
                  <Avatar name={displayName(u, locale)} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {displayName(u, locale)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {u.roles.map((r) => tr(`role.${r.role}`)).join("・")}
                    </p>
                  </div>
                  <form action={assignTeacherAction}>
                    <input type="hidden" name="userId" value={u.id} />
                    <SubmitButton className="px-3 text-xs">
                      <UserPlus aria-hidden="true" className="size-4" />
                      {t("add.button")}
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>{t("add.none")}</EmptyState>
          )
        ) : (
          <p className="text-sm text-slate-600">{t("add.hint")}</p>
        )}
      </Card>

      <Card
        className="space-y-3"
        role="region"
        aria-labelledby="teachers-current"
      >
        <h2
          id="teachers-current"
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <GraduationCap aria-hidden="true" className="size-5 text-brand-700" />
          {t("current.title")}
          <Badge tone="brand">{current.length}</Badge>
        </h2>
        <p className="text-sm text-slate-600">{t("current.hint")}</p>
        {current.length ? (
          <ul className="divide-y divide-slate-100">
            {current.map((u) => {
              const role = u.roles[0];
              return (
                <li key={u.id} className="flex items-center gap-3 py-3">
                  <Avatar name={displayName(u, locale)} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {displayName(u, locale)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {[
                        role?.yearsFrom
                          ? t("current.since", { year: role.yearsFrom })
                          : null,
                        role?.subjects,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <form action={unassignTeacherAction}>
                    <input type="hidden" name="userId" value={u.id} />
                    <SubmitButton variant="secondary" className="px-3 text-xs">
                      <UserMinus aria-hidden="true" className="size-4" />
                      {t("current.remove")}
                    </SubmitButton>
                  </form>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState>{t("current.none")}</EmptyState>
        )}
      </Card>
    </div>
  );
}
