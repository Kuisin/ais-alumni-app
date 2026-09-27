import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LineLinkPanel } from "@/components/line/line-link-panel";
import { SetupChecklist } from "@/components/setup/setup-checklist";
import { Badge, Card, PageHeader } from "@/components/ui/card";
import { AccountState } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { parseLinkOutcome } from "@/lib/line-link";
import { requireState } from "@/lib/session";
import { loadSetupChecklist } from "@/lib/setup-db";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/onboarding/status">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "onboarding" });
  return { title: t("status.metaTitle") };
}

const TONE = {
  PENDING_REVIEW: "amber",
  REJECTED: "red",
  DEACTIVATED: "slate",
} as const;

/** Where PENDING_REVIEW / REJECTED / DEACTIVATED users land (§3.3, §14 screen 5). */
export default async function OnboardingStatusPage({
  params,
  searchParams,
}: PageProps<"/[locale]/app/onboarding/status">) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === "en" ? "en" : "ja";
  const user = await requireState(
    AccountState.PENDING_REVIEW,
    AccountState.REJECTED,
    AccountState.DEACTIVATED,
  );
  const state = user.state as keyof typeof TONE;
  const [t, tRoles, request] = await Promise.all([
    getTranslations("onboarding"),
    getTranslations("roles"),
    db.verificationRequest.findUnique({
      where: { userId: user.id },
      select: {
        submittedAt: true,
        decidedAt: true,
        reviewNote: true,
        followsChildren: true,
      },
    }),
  ]);
  // Parents alone wait for a child's approval, not for the committee.
  const parentWaiting =
    state === "PENDING_REVIEW" && request?.followsChildren === true;
  const children = parentWaiting
    ? await db.familyLink.findMany({
        where: { parentId: user.id, childId: { not: null } },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          childName: true,
          confirmedAt: true,
          child: { select: { state: true, managedById: true } },
        },
      })
    : [];
  const childState = (c: (typeof children)[number]) =>
    c.child?.state === AccountState.REJECTED
      ? "rejected"
      : c.child?.state === AccountState.ACTIVE
        ? c.confirmedAt || c.child.managedById === user.id
          ? "approved"
          : "needsConfirm"
        : "review";
  const outcome = parseLinkOutcome((await searchParams).line);
  const wantsLine =
    state === "PENDING_REVIEW" && !(user.lineUserId && user.lineFollowing);

  return (
    <>
      <PageHeader
        title={
          parentWaiting
            ? t("status.parentWaiting.title")
            : t(`status.${state}.title`)
        }
      />
      {state === "PENDING_REVIEW" ? (
        <SetupChecklist items={await loadSetupChecklist(user)} />
      ) : null}
      <Card className="space-y-4">
        <p>
          <Badge tone={TONE[state]}>{tRoles(`state.${state}`)}</Badge>
        </p>
        <p className="text-slate-700">
          {parentWaiting
            ? t("status.parentWaiting.body")
            : t(`status.${state}.body`)}
        </p>
        {children.length ? (
          <section aria-labelledby="children-status">
            <h2 id="children-status" className="mb-2 text-sm font-semibold">
              {t("status.parentWaiting.children")}
            </h2>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {children.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{c.childName ?? "—"}</span>
                  <Badge
                    tone={
                      childState(c) === "approved"
                        ? "green"
                        : childState(c) === "rejected"
                          ? "red"
                          : "amber"
                    }
                  >
                    {t(`status.parentWaiting.state.${childState(c)}`)}
                  </Badge>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
          {request ? (
            <>
              <dt className="text-slate-600">{t("status.submittedAt")}</dt>
              <dd>{formatDate(request.submittedAt, locale)}</dd>
            </>
          ) : null}
          {state === "REJECTED" && request?.decidedAt ? (
            <>
              <dt className="text-slate-600">{t("status.decidedAt")}</dt>
              <dd>{formatDate(request.decidedAt, locale)}</dd>
            </>
          ) : null}
          {state === "DEACTIVATED" && user.deactivatedAt ? (
            <>
              <dt className="text-slate-600">{t("status.deactivatedAt")}</dt>
              <dd>{formatDate(user.deactivatedAt, locale)}</dd>
            </>
          ) : null}
        </dl>

        {state === "REJECTED" && request?.reviewNote ? (
          <section
            aria-labelledby="review-note"
            className="rounded-lg bg-slate-50 p-4"
          >
            <h2 id="review-note" className="text-sm font-semibold">
              {t("status.reviewNote")}
            </h2>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-800">
              {request.reviewNote}
            </p>
          </section>
        ) : null}

        {state !== "PENDING_REVIEW" ? (
          <p className="text-sm text-slate-600">{t("status.contact")}</p>
        ) : null}
      </Card>

      {wantsLine ? (
        <Card id="line" className="mt-4 scroll-mt-20 space-y-3">
          <h2 className="font-semibold">{t("status.lineTitle")}</h2>
          <p className="text-sm text-slate-700">{t("status.lineBody")}</p>
          <LineLinkPanel
            userId={user.id}
            returnTo="/app/onboarding/status"
            outcome={outcome}
          />
        </Card>
      ) : null}
    </>
  );
}
