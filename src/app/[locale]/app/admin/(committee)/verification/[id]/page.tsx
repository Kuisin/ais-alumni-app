import { ChevronRight, Gavel } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { ChildrenReview } from "@/components/admin/children-review";
import { BackLink } from "@/components/ui/back-link";
import { buttonClass } from "@/components/ui/button";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import {
  AddVoucherButton,
  DecisionForm,
} from "@/components/verify/admin-forms";
import { AnswersView } from "@/components/verify/answers-view";
import { RoleKey, VerificationStatus } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import { isMinor } from "@/lib/authz/core";
import { db } from "@/lib/db";
import { displayName, formatDate, formatDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { signedFileUrl } from "@/lib/storage";
import { ROSTER_MATCH_THRESHOLD } from "@/lib/verification/roster";
import { findMembersByName } from "@/lib/verification/vouch";

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminVerify" });
  return { title: t("detail.title") };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </Card>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** §14 screen 15 — request detail and decision. Admins see all fields here. */
export default async function VerificationDetailPage({
  params,
  searchParams,
}: Props) {
  const { locale, id } = await params;
  const lang = locale === "en" ? "en" : "ja";
  await requireAdmin();
  const { q: rawQ } = await searchParams;
  const q = (Array.isArray(rawQ) ? rawQ[0] : rawQ)?.trim().slice(0, 100) ?? "";
  const t = await getTranslations("adminVerify");
  const tr = await getTranslations("roles");
  const tv = await getTranslations("vouch");

  const request = await db.verificationRequest.findUnique({
    where: { id },
    include: {
      user: {
        include: {
          roles: true,
          childLinks: {
            include: {
              parent: { select: { nameRomaji: true, nameKanji: true } },
            },
          },
          parentLinks: {
            select: {
              id: true,
              childName: true,
              childId: true,
              confirmedAt: true,
            },
          },
        },
      },
      reviewer: { select: { nameRomaji: true, nameKanji: true } },
      evidence: { orderBy: { createdAt: "asc" } },
      vouches: {
        orderBy: { askedAt: "asc" },
        include: {
          voucher: { select: { id: true, nameRomaji: true, nameKanji: true } },
        },
      },
    },
  });
  if (!request) notFound();
  const { user } = request;

  const rosterRow = request.rosterRowId
    ? await db.rosterEntry.findUnique({ where: { id: request.rosterRowId } })
    : null;
  const candidates = q
    ? await findMembersByName(q, {
        threshold: 0.5,
        limit: 10,
        excludeUserIds: [user.id, ...request.vouches.map((v) => v.voucherId)],
      })
    : [];

  const roles = user.roles.map((r) => r.role);
  const minor = isMinor({ roles, dateOfBirth: user.dateOfBirth });
  const parentConfirmed = user.childLinks.some((l) => l.confirmedAt);
  const teacher = user.roles.find((r) => r.role === RoleKey.TEACHER);
  const _former = user.roles.find((r) => r.role === RoleKey.FORMER_STUDENT);
  const open = request.status === VerificationStatus.PENDING;
  const canAddVoucher =
    open || request.status === VerificationStatus.NEEDS_INFO;

  return (
    <div className="space-y-6">
      <BackLink href="/app/admin/verification">{t("detail.back")}</BackLink>
      <PageHeader
        title={displayName(user, lang)}
        description={t("detail.submitted", {
          date: formatDateTime(request.submittedAt, lang),
        })}
        actions={
          <Badge tone={open ? "amber" : "slate"}>
            {t(`status.${request.status}`)}
          </Badge>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        {teacher?.schoolEmailVerified ? (
          <Badge tone="green">{t("badges.schoolEmail")}</Badge>
        ) : null}
        {minor ? <Badge tone="amber">{t("badges.minor")}</Badge> : null}
        {minor ? (
          parentConfirmed ? (
            <Badge tone="green">{t("badges.parentConfirmed")}</Badge>
          ) : (
            <Badge tone="red">{t("badges.parentUnconfirmed")}</Badge>
          )
        ) : null}
      </div>
      {minor ? (
        <p className="text-sm text-slate-600">{t("detail.minorNote")}</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-6">
          {request.reviewNote || request.decidedAt ? (
            <Section title={t("detail.lastDecision")}>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-[12rem_1fr]">
                {request.decidedAt ? (
                  <>
                    <dt className="text-slate-600">{t("detail.decidedAt")}</dt>
                    <dd>
                      {formatDateTime(request.decidedAt, lang)}
                      {request.reviewer
                        ? ` · ${displayName(request.reviewer, lang)}`
                        : ""}
                    </dd>
                  </>
                ) : null}
                {request.reviewNote ? (
                  <>
                    <dt className="text-slate-600">{t("detail.note")}</dt>
                    <dd className="whitespace-pre-line">
                      {request.reviewNote}
                    </dd>
                  </>
                ) : null}
              </dl>
            </Section>
          ) : null}

          <Section title={t("detail.account")}>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-[12rem_1fr]">
              <dt className="text-slate-600">{t("detail.email")}</dt>
              <dd className="break-all">{user.primaryEmail ?? "—"}</dd>
              <dt className="text-slate-600">{t("detail.state")}</dt>
              <dd>{tr(`state.${user.state}`)}</dd>
              {user.dateOfBirth ? (
                <>
                  <dt className="text-slate-600">{t("detail.dob")}</dt>
                  <dd>{formatDate(user.dateOfBirth, lang)}</dd>
                </>
              ) : null}
              {teacher?.schoolEmail ? (
                <>
                  <dt className="text-slate-600">{t("detail.schoolEmail")}</dt>
                  <dd className="break-all">
                    {teacher.schoolEmail}{" "}
                    {teacher.schoolEmailVerified
                      ? t("detail.verified")
                      : t("detail.unverified")}
                  </dd>
                </>
              ) : null}
              {user.childLinks.length ? (
                <>
                  <dt className="text-slate-600">{t("detail.parents")}</dt>
                  <dd>
                    {user.childLinks
                      .map(
                        (l) =>
                          `${displayName(l.parent, lang)} (${l.confirmedAt ? t("detail.confirmed") : t("detail.unconfirmed")})`,
                      )
                      .join(", ")}
                  </dd>
                </>
              ) : null}
              {user.parentLinks.length ? (
                <>
                  <dt className="text-slate-600">{t("detail.children")}</dt>
                  <dd>
                    {user.parentLinks
                      .map(
                        (l) =>
                          `${l.childName ?? "—"}${l.childId ? ` (${t("detail.linked")})` : ""}`,
                      )
                      .join(", ")}
                  </dd>
                </>
              ) : null}
            </dl>
          </Section>

          {user.roles.some(
            (r) =>
              r.role === RoleKey.CURRENT_PARENT ||
              r.role === RoleKey.FORMER_PARENT,
          ) ? (
            <Section title={t("children.title")}>
              <p className="text-sm text-slate-600">
                {t("children.description")}
              </p>
              <ChildrenReview parentId={user.id} />
            </Section>
          ) : null}

          <Section title={t("detail.answers")}>
            <AnswersView answers={request.answers} />
          </Section>

          <Section title={t("detail.roster")}>
            {request.rosterScore === null ? (
              <p className="text-sm text-slate-600">{t("detail.noRoster")}</p>
            ) : (
              <div className="space-y-2 text-sm">
                <p>
                  <Badge
                    tone={
                      request.rosterScore >= ROSTER_MATCH_THRESHOLD
                        ? "green"
                        : "amber"
                    }
                  >
                    {t("badges.roster", { score: request.rosterScore })}
                  </Badge>{" "}
                  {request.rosterScore >= ROSTER_MATCH_THRESHOLD
                    ? t("detail.rosterMatch")
                    : t("detail.rosterWeak")}
                </p>
                {rosterRow ? (
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-1 rounded-lg bg-slate-50 p-3 sm:grid-cols-[12rem_1fr]">
                    <dt className="text-slate-600">{t("roster.nameRomaji")}</dt>
                    <dd>{rosterRow.nameRomaji}</dd>
                    <dt className="text-slate-600">{t("roster.nameKanji")}</dt>
                    <dd>{rosterRow.nameKanji ?? "—"}</dd>
                    <dt className="text-slate-600">{t("roster.dob")}</dt>
                    <dd>
                      {rosterRow.dateOfBirth
                        ? rosterRow.dateOfBirth.toISOString().slice(0, 10)
                        : "—"}
                    </dd>
                    <dt className="text-slate-600">{t("roster.years")}</dt>
                    <dd>
                      {rosterRow.yearsFrom ?? "?"}–{rosterRow.yearsTo ?? "?"}
                    </dd>
                    <dt className="text-slate-600">{t("roster.kind")}</dt>
                    <dd>{tr(`role.${rosterRow.kind}`)}</dd>
                    {rosterRow.claimedByUserId ? (
                      <>
                        <dt className="text-slate-600">
                          {t("roster.claimed")}
                        </dt>
                        <dd>
                          {rosterRow.claimedByUserId === user.id
                            ? t("roster.claimedByApplicant")
                            : t("roster.claimedByOther")}
                        </dd>
                      </>
                    ) : null}
                  </dl>
                ) : (
                  <p className="text-slate-600">{t("detail.rosterRowGone")}</p>
                )}
              </div>
            )}
          </Section>

          <Section title={t("detail.vouches")}>
            {request.vouches.length ? (
              <ul className="divide-y divide-slate-200 text-sm">
                {request.vouches.map((v) => (
                  <li
                    key={v.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <span>{displayName(v.voucher, lang)}</span>
                    <span className="flex items-center gap-2">
                      <Badge
                        tone={
                          v.answer === "YES"
                            ? "green"
                            : v.answer === "NO"
                              ? "red"
                              : "slate"
                        }
                      >
                        {v.answer
                          ? tv(`answers.${v.answer}`)
                          : t("vouches.pending")}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {formatDateTime(v.answeredAt ?? v.askedAt, lang)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState>{t("vouches.none")}</EmptyState>
            )}
            {canAddVoucher ? (
              <div className="space-y-3 border-t border-slate-200 pt-3">
                <search>
                  <form method="get" className="flex flex-wrap items-end gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <label
                        htmlFor="voucher-q"
                        className="block text-sm font-medium text-slate-800"
                      >
                        {t("vouches.searchLabel")}
                      </label>
                      <Input
                        id="voucher-q"
                        name="q"
                        defaultValue={q}
                        maxLength={100}
                      />
                    </div>
                    <button type="submit" className={buttonClass("secondary")}>
                      {t("vouches.search")}
                    </button>
                  </form>
                </search>
                {q ? (
                  candidates.length ? (
                    <ul className="divide-y divide-slate-200 text-sm">
                      {candidates.map((c) => {
                        const name = displayName(c, lang);
                        return (
                          <li
                            key={c.id}
                            className="flex flex-wrap items-center justify-between gap-2 py-2"
                          >
                            <span>
                              {name}
                              {c.nameRomaji && c.nameRomaji !== name ? (
                                <span className="text-slate-500">
                                  {" "}
                                  ({c.nameRomaji})
                                </span>
                              ) : null}
                            </span>
                            <AddVoucherButton
                              requestId={request.id}
                              voucherId={c.id}
                              name={name}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-600">
                      {t("vouches.noResults")}
                    </p>
                  )
                ) : null}
              </div>
            ) : null}
          </Section>

          <Section title={t("detail.evidence")}>
            {request.evidence.length ? (
              <ul className="space-y-2 text-sm">
                {request.evidence.map((e) => (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-center justify-between gap-2"
                  >
                    <a
                      href={signedFileUrl(e.storageKey)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-brand-700 underline"
                    >
                      {e.fileName}
                    </a>
                    <span className="text-xs text-slate-500">
                      {e.mimeType} · {formatSize(e.size)}
                      {e.deleteAfter
                        ? ` · ${t("detail.deleteAfter", { date: formatDate(e.deleteAfter, lang) })}`
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState>{t("detail.noEvidence")}</EmptyState>
            )}
            {request.evidence.length ? (
              <p className="text-xs text-slate-500">{t("detail.linkExpiry")}</p>
            ) : null}
          </Section>
        </div>
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-20">
          <Card className="space-y-3 lg:border-brand-200 lg:shadow-md">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Gavel aria-hidden="true" className="size-5 text-brand-700" />
              {t("decision.title")}
            </h2>
            {open ? (
              <DecisionForm requestId={request.id} />
            ) : (
              <p className="text-sm text-slate-600">{t("decision.closed")}</p>
            )}
          </Card>
          <Card className="space-y-2">
            <h2 className="font-semibold">{t("aisRecord.title")}</h2>
            <p className="text-sm text-slate-600">
              {t("aisRecord.description")}
            </p>
            <Link
              href={`/app/admin/members/${user.id}#roles`}
              className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
            >
              {t("aisRecord.edit")}
              <ChevronRight aria-hidden="true" className="size-4" />
            </Link>
          </Card>
        </aside>
      </div>
    </div>
  );
}
