import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AUDIT_ROW_INCLUDE, AuditList } from "@/components/admin/audit-list";
import { MemberMerge } from "@/components/admin/member-merge";
import { MemberProfileForm } from "@/components/admin/member-profile-form";
import {
  AddRoleForm,
  MemberRoleForm,
} from "@/components/admin/member-role-form";
import {
  MemberAdminControl,
  MemberStateControl,
} from "@/components/admin/member-status";
import { Alert, Badge, Card, PageHeader } from "@/components/ui/card";
import { AccountState, RoleKey } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { displayName, formatDate, formatDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/members/[id]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminMembers" });
  return { title: t("detail.title") };
}

const AUDIT_LIMIT = 50;

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      <Card>
        <h2 id={id} className="mb-4 text-lg font-semibold">
          {title}
        </h2>
        {children}
      </Card>
    </section>
  );
}

export default async function AdminMemberPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/members/[id]">) {
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
  const available = roleOrder.filter((r) => !roles.some((x) => x.role === r));
  const lineStatus = !user.lineUserId
    ? t("line.notLinked")
    : user.lineFollowing
      ? t("line.following")
      : t("line.linkedNotFollowing");

  return (
    <div className="space-y-6">
      <p>
        <Link
          href="/admin/members"
          className="text-sm text-brand-700 underline"
        >
          ← {t("detail.back")}
        </Link>
      </p>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {name}
            {user.isAdmin ? (
              <Badge tone="brand">{t("badge.admin")}</Badge>
            ) : null}
          </span>
        }
        description={user.primaryEmail ?? undefined}
      />

      {sp.merged ? <Alert tone="success">{t("detail.merged")}</Alert> : null}

      <Card>
        <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-slate-600">{t("columns.state")}</dt>
          <dd>{tr(`state.${user.state}`)}</dd>
          <dt className="text-slate-600">{t("columns.roles")}</dt>
          <dd>{roles.map((r) => tr(`role.${r.role}`)).join(", ") || "—"}</dd>
          <dt className="text-slate-600">{t("columns.email")}</dt>
          <dd className="break-all">
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
          <dd className="font-mono text-xs break-all">{user.id}</dd>
        </dl>
      </Card>

      <Section id="profile" title={t("profile.title")}>
        <MemberProfileForm
          userId={user.id}
          values={{
            nameRomaji: user.nameRomaji ?? "",
            nameKanji: user.nameKanji ?? "",
            nameAtAis: user.nameAtAis ?? "",
            dateOfBirth: user.dateOfBirth
              ? user.dateOfBirth.toISOString().slice(0, 10)
              : "",
            bio: user.bio ?? "",
            phone: user.phone ?? "",
          }}
        />
      </Section>

      <Section id="roles" title={t("roles.title")}>
        <div className="space-y-3">
          {roles.length === 0 ? (
            <p className="text-sm text-slate-600">{t("roles.none")}</p>
          ) : null}
          {roles.map((r) => (
            <details
              key={r.id}
              className="rounded-lg border border-slate-200 p-3"
              open={roles.length === 1}
            >
              <summary className="cursor-pointer font-medium">
                {tr(`role.${r.role}`)}
                {r.role === RoleKey.FORMER_STUDENT && r.graduationOrLeaveYear
                  ? ` · ${r.graduationOrLeaveYear}`
                  : ""}
                {r.role === RoleKey.FORMER_STUDENT && r.currentStage
                  ? ` · ${tr(`stage.${r.currentStage}`)}`
                  : ""}
              </summary>
              <div className="mt-3">
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
                  values={{
                    role: r.role,
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
            <details className="rounded-lg border border-dashed border-slate-300 p-3">
              <summary className="cursor-pointer font-medium text-brand-700">
                {t("roles.addTitle")}
              </summary>
              <div className="mt-3">
                <AddRoleForm userId={user.id} available={available} />
              </div>
            </details>
          ) : null}
        </div>
      </Section>

      <div className="grid gap-6 md:grid-cols-2">
        <Section id="status" title={t("status.title")}>
          <MemberStateControl
            userId={user.id}
            state={user.state}
            isSelf={isSelf}
          />
        </Section>
        <Section id="admin" title={t("admin.title")}>
          <MemberAdminControl
            userId={user.id}
            isAdmin={user.isAdmin}
            isSelf={isSelf}
            canGrant={user.state === AccountState.ACTIVE}
          />
        </Section>
      </div>

      <Section id="merge" title={t("merge.title")}>
        <p className="mb-4 text-sm text-slate-600">{t("merge.description")}</p>
        <MemberMerge userId={user.id} />
      </Section>

      <Section id="audit" title={t("audit.title")}>
        <AuditList rows={audits} />
        {audits.length === AUDIT_LIMIT ? (
          <p className="mt-3 text-sm">
            <Link
              href={{ pathname: "/admin/audit", query: { target: user.id } }}
              className="text-brand-700 underline"
            >
              {t("audit.viewAll")}
            </Link>
          </p>
        ) : null}
      </Section>
    </div>
  );
}
