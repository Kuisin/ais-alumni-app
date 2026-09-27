import {
  BadgeCheck,
  ChevronRight,
  GraduationCap,
  History,
  IdCard,
  Merge,
  Plus,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AUDIT_ROW_INCLUDE, AuditList } from "@/components/admin/audit-list";
import { MemberMerge } from "@/components/admin/member-merge";
import { MemberPositionControl } from "@/components/admin/member-positions";
import { MemberProfileForm } from "@/components/admin/member-profile-form";
import {
  AddRoleForm,
  MemberRoleForm,
} from "@/components/admin/member-role-form";
import {
  MemberAdminControl,
  MemberStateControl,
} from "@/components/admin/member-status";
import { AdminSection, SectionNav } from "@/components/admin/section-nav";
import { BackLink } from "@/components/ui/back-link";
import { Alert, Badge, PageHeader } from "@/components/ui/card";
import { AccountState, PositionKey, RoleKey } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import { roleLabelKey } from "@/lib/audience";
import { isCurrentTeacher } from "@/lib/authz";
import { cohortNumbersById, loadCohortChoices } from "@/lib/cohorts-db";
import { db } from "@/lib/db";
import { MESSAGES_ENABLED } from "@/lib/features";
import { displayName, formatDate, formatDateTime } from "@/lib/format";
import { namePartsOf } from "@/lib/names";
import { positionEligible } from "@/lib/permissions";
import { requireAdmin } from "@/lib/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/admin/members/[id]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminMembers" });
  return { title: t("detail.title") };
}

const AUDIT_LIMIT = 10;

export default async function AdminMemberPage({
  params,
  searchParams,
}: PageProps<"/[locale]/app/admin/members/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const admin = await requireAdmin();
  const t = await getTranslations("adminMembers");
  const tr = await getTranslations("roles");
  const locale = (await getLocale()) === "en" ? "en" : "ja";

  const user = await db.user.findUnique({
    where: { id },
    include: { roles: true, accounts: { select: { provider: true } } },
  });
  if (!user) notFound();

  const audits = await db.auditLog.findMany({
    where: { OR: [{ targetId: id }, { actorId: id }] },
    orderBy: { createdAt: "desc" },
    take: AUDIT_LIMIT,
    include: AUDIT_ROW_INCLUDE,
  });

  const isSelf = user.id === admin.id;
  const name =
    user.nameRomaji || user.nameKanji ? displayName(user, locale) : t("noName");
  const roleOrder = Object.values(RoleKey);
  const roles = [...user.roles].sort(
    (a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role),
  );
  // Add by type (student / parent / teacher); current vs former is derived.
  const has = (keys: RoleKey[]) => roles.some((x) => keys.includes(x.role));
  const available: RoleKey[] = [
    ...(has([RoleKey.CURRENT_STUDENT, RoleKey.FORMER_STUDENT])
      ? []
      : [RoleKey.CURRENT_STUDENT]),
    ...(has([RoleKey.CURRENT_PARENT, RoleKey.FORMER_PARENT])
      ? []
      : [RoleKey.CURRENT_PARENT]),
    ...(has([RoleKey.TEACHER]) ? [] : [RoleKey.TEACHER]),
  ];
  const roleKeys = roles.map((r) => r.role);
  const positions = await db.userPosition.findMany({
    where: { userId: user.id },
    select: { position: true, cohortId: true },
  });
  // Suggested 学年 for a student leader: the one on their student role.
  const defaultCohort =
    roles.find(
      (r) =>
        (r.role === RoleKey.FORMER_STUDENT ||
          r.role === RoleKey.CURRENT_STUDENT) &&
        r.cohortId,
    )?.cohortId ?? null;
  const cohortChoices = await loadCohortChoices(locale === "en" ? "en" : "ja");
  const cohortNumbers = await cohortNumbersById();
  const lineStatus = !user.lineUserId
    ? t("line.notLinked")
    : user.lineFollowing
      ? t("line.following")
      : t("line.linkedNotFollowing");

  const summary = (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      <dt className="text-slate-600">{t("columns.state")}</dt>
      <dd>{tr(`state.${user.state}`)}</dd>
      <dt className="text-slate-600">{t("columns.roles")}</dt>
      <dd>{roles.map((r) => tr(roleLabelKey(r))).join(", ") || "—"}</dd>
      <dt className="text-slate-600">{t("columns.email")}</dt>
      <dd className="min-w-0 break-all">
        {user.primaryEmail ?? "—"}
        {user.primaryEmail && !user.emailVerifiedAt
          ? ` (${t("detail.unverified")})`
          : ""}
      </dd>
      <dt className="text-slate-600">{t("columns.line")}</dt>
      <dd>
        {lineStatus}
        {user.lineDisplayName ? ` · ${user.lineDisplayName}` : ""}
      </dd>
      <dt className="text-slate-600">{t("detail.providers")}</dt>
      <dd>
        {[
          user.primaryEmail && user.emailVerifiedAt ? "email" : null,
          ...user.accounts.map((a) => a.provider),
        ]
          .filter(Boolean)
          .join(", ") || "—"}
      </dd>
      <dt className="text-slate-600">{t("detail.notifyVia")}</dt>
      <dd>{user.notifyVia}</dd>
      <dt className="text-slate-600">{t("columns.created")}</dt>
      <dd>{formatDateTime(user.createdAt, locale)}</dd>
      {user.deactivatedAt ? (
        <>
          <dt className="text-slate-600">{t("detail.deactivatedAt")}</dt>
          <dd>{formatDateTime(user.deactivatedAt, locale)}</dd>
        </>
      ) : null}
      <dt className="text-slate-600">ID</dt>
      <dd className="min-w-0 truncate font-mono text-xs" title={user.id}>
        {user.id}
      </dd>
    </dl>
  );

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/app/admin/members">{t("detail.back")}</BackLink>
        <PageHeader
          title={
            <span className="flex flex-wrap items-center gap-2">
              {name}
              {user.isAdmin ? (
                <Badge tone="brand">{t("badge.admin")}</Badge>
              ) : null}
            </span>
          }
          description={
            user.primaryEmail ? (
              <span className="break-all">{user.primaryEmail}</span>
            ) : undefined
          }
        />
      </div>

      {sp.merged ? <Alert tone="success">{t("detail.merged")}</Alert> : null}

      <SectionNav
        label={t("detail.sections")}
        items={[
          {
            id: "overview",
            label: t("detail.overview"),
            icon: <IdCard className="size-4" />,
          },
          {
            id: "profile",
            label: t("profile.title"),
            icon: <UserRound className="size-4" />,
          },
          {
            id: "roles",
            label: t("roles.title"),
            icon: <GraduationCap className="size-4" />,
          },
          {
            id: "positions",
            label: t("positions.title"),
            icon: <BadgeCheck className="size-4" />,
          },
          {
            id: "account",
            label: t("detail.account"),
            icon: <ShieldCheck className="size-4" />,
          },
          {
            id: "merge",
            label: t("merge.title"),
            icon: <Merge className="size-4" />,
          },
          {
            id: "audit",
            label: t("audit.title"),
            icon: <History className="size-4" />,
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <div className="min-w-0 space-y-6">
          <AdminSection
            id="overview"
            title={t("detail.overview")}
            icon={<IdCard />}
            className="xl:hidden"
          >
            {summary}
          </AdminSection>

          <AdminSection
            id="profile"
            title={t("profile.title")}
            icon={<UserRound />}
          >
            <MemberProfileForm
              userId={user.id}
              values={{
                ...namePartsOf(user),
                nameAtAis: user.nameAtAis ?? "",
                dateOfBirth: user.dateOfBirth
                  ? user.dateOfBirth.toISOString().slice(0, 10)
                  : "",
                bio: user.bio ?? "",
                phone: user.phone ?? "",
              }}
            />
          </AdminSection>

          <AdminSection
            id="roles"
            title={t("roles.title")}
            icon={<GraduationCap />}
          >
            <div className="space-y-3">
              {roles.length === 0 ? (
                <p className="text-sm text-slate-600">{t("roles.none")}</p>
              ) : null}
              {roles.map((r) => (
                <details
                  key={r.id}
                  className="group rounded-lg border border-slate-200"
                  open={roles.length === 1}
                >
                  <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-lg px-3 font-medium hover:bg-slate-50">
                    <ChevronRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-90"
                    />
                    <span className="min-w-0 flex-1">
                      {tr(roleLabelKey(r))}
                      {r.role === RoleKey.FORMER_STUDENT &&
                      r.graduationOrLeaveYear
                        ? ` · ${r.graduationOrLeaveYear}`
                        : ""}
                      {r.role === RoleKey.FORMER_STUDENT && r.currentStage
                        ? ` · ${tr(`stage.${r.currentStage}`)}`
                        : ""}
                    </span>
                  </summary>
                  <div className="border-t border-slate-100 p-3">
                    {r.role === RoleKey.FORMER_STUDENT &&
                    r.currentStageUpdatedAt ? (
                      <p className="mb-3 text-xs text-slate-500">
                        {t("roles.stageUpdatedAt", {
                          date: formatDate(r.currentStageUpdatedAt, locale),
                        })}
                      </p>
                    ) : null}
                    <MemberRoleForm
                      userId={user.id}
                      cohorts={cohortChoices}
                      values={{
                        role: r.role,
                        cohortNumber: r.cohortId
                          ? (cohortNumbers.get(r.cohortId) ?? null)
                          : null,
                        teacherStatus: r.teacherStatus,
                        yearsFrom: r.yearsFrom,
                        yearsTo: r.yearsTo,
                        subjects: r.subjects,
                        schoolEmail: r.schoolEmail,
                        schoolEmailVerified: r.schoolEmailVerified,
                        currentGrade: r.currentGrade,
                        studentIdNo: r.studentIdNo,
                        lastDivision: r.lastDivision,
                        graduationOrLeaveYear: r.graduationOrLeaveYear,
                        didGraduate: r.didGraduate,
                        currentStage: r.currentStage,
                        currentStageDetail: r.currentStageDetail,
                      }}
                    />
                  </div>
                </details>
              ))}
              {available.length ? (
                <details className="group rounded-lg border border-dashed border-slate-300">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-lg px-3 font-medium text-brand-700 hover:bg-brand-50">
                    <Plus aria-hidden="true" className="size-4 shrink-0" />
                    {t("roles.addTitle")}
                  </summary>
                  <div className="border-t border-slate-100 p-3">
                    <AddRoleForm
                      userId={user.id}
                      available={available}
                      cohorts={cohortChoices}
                    />
                  </div>
                </details>
              ) : null}
            </div>
          </AdminSection>

          <AdminSection
            id="positions"
            title={t("positions.title")}
            icon={<BadgeCheck />}
          >
            <div className="grid gap-3 2xl:grid-cols-2">
              {Object.values(PositionKey)
                .filter(
                  (p) =>
                    MESSAGES_ENABLED || p === PositionKey.TEACHER_REGISTRAR,
                )
                .map((p) => {
                  const held = positions.find((x) => x.position === p);
                  return (
                    <MemberPositionControl
                      key={p}
                      userId={user.id}
                      position={p}
                      held={Boolean(held)}
                      cohortNumber={
                        held?.cohortId
                          ? (cohortNumbers.get(held.cohortId) ?? null)
                          : null
                      }
                      defaultCohortNumber={
                        defaultCohort
                          ? (cohortNumbers.get(defaultCohort) ?? null)
                          : null
                      }
                      cohorts={cohortChoices}
                      eligible={positionEligible(
                        p,
                        roleKeys,
                        isCurrentTeacher(roles),
                      )}
                    />
                  );
                })}
            </div>
          </AdminSection>
        </div>

        <aside className="min-w-0 space-y-6">
          <div className="hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:block">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <IdCard aria-hidden="true" className="size-5 text-brand-700" />
              {t("detail.overview")}
            </h2>
            {summary}
          </div>
          <AdminSection
            id="account"
            title={t("detail.account")}
            icon={<ShieldCheck />}
          >
            <div className="space-y-5">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-700">
                  {t("status.title")}
                </h3>
                <MemberStateControl
                  userId={user.id}
                  state={user.state}
                  isSelf={isSelf}
                />
              </div>
              <div className="border-t border-slate-100 pt-4">
                <h3 className="mb-2 text-sm font-semibold text-slate-700">
                  {t("admin.title")}
                </h3>
                <MemberAdminControl
                  userId={user.id}
                  isAdmin={user.isAdmin}
                  isSelf={isSelf}
                  canGrant={user.state === AccountState.ACTIVE}
                />
              </div>
            </div>
          </AdminSection>
          <AdminSection
            id="merge"
            title={t("merge.title")}
            icon={<Merge />}
            description={t("merge.description")}
          >
            <MemberMerge userId={user.id} />
          </AdminSection>
        </aside>
      </div>

      <AdminSection id="audit" title={t("audit.title")} icon={<History />}>
        <AuditList rows={audits} />
        <p className="mt-3">
          <Link
            href={{
              pathname: "/app/admin/audit",
              query: { target: user.id },
            }}
            className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
          >
            {t("audit.viewAll")}
            <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
        </p>
      </AdminSection>
    </div>
  );
}
