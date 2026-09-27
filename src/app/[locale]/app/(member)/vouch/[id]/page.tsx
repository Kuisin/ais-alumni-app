import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { Card, PageHeader } from "@/components/ui/card";
import { VouchAnswerForm } from "@/components/verify/vouch-answer";
import { VerificationStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { displayName } from "@/lib/format";
import { requireActive } from "@/lib/session";
import { yearsFromAnswers } from "@/lib/verification/vouch";

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "vouch" });
  return { title: t("title") };
}

/**
 * "Do you know X?" (§6.4.2). Only the asked voucher may view; the applicant
 * is shown with minimal information (name, years at AIS).
 */
export default async function VouchPage({ params }: Props) {
  const { locale, id } = await params;
  const lang = locale === "en" ? "en" : "ja";
  const user = await requireActive();
  const t = await getTranslations("vouch");
  const tc = await getTranslations("common");

  const vouch = await db.vouch.findUnique({
    where: { id },
    select: {
      voucherId: true,
      answer: true,
      request: {
        select: {
          status: true,
          answers: true,
          user: {
            select: { nameRomaji: true, nameKanji: true, nameAtAis: true },
          },
        },
      },
    },
  });
  // Same response for "missing" and "not yours" so ids cannot be probed.
  if (!vouch || vouch.voucherId !== user.id) notFound();

  const applicant = vouch.request.user;
  const name = displayName(applicant, lang);
  const otherName = lang === "ja" ? applicant.nameRomaji : applicant.nameKanji;
  const years = yearsFromAnswers(vouch.request.answers, t("present"));
  const closed =
    vouch.request.status !== VerificationStatus.PENDING &&
    vouch.request.status !== VerificationStatus.NEEDS_INFO;

  return (
    <div className="mx-auto max-w-xl">
      <BackLink href="/app/dashboard">{tc("nav.dashboard")}</BackLink>
      <PageHeader title={t("title")} description={t("intro")} />
      <Card className="space-y-4">
        <div>
          <p className="text-xl font-semibold">{name}</p>
          {otherName && otherName !== name ? (
            <p className="text-slate-600">{otherName}</p>
          ) : null}
          {applicant.nameAtAis ? (
            <p className="text-sm text-slate-600">
              {t("nameAtAis", { name: applicant.nameAtAis })}
            </p>
          ) : null}
          {years ? (
            <p className="text-sm text-slate-600">{t("years", { years })}</p>
          ) : null}
        </div>
        <p className="font-medium">{t("question")}</p>
        <VouchAnswerForm vouchId={id} current={vouch.answer} closed={closed} />
        <p className="text-xs text-slate-500">{t("privacy")}</p>
      </Card>
    </div>
  );
}
