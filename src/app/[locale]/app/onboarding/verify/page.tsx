import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Alert, PageHeader } from "@/components/ui/card";
import { VerifyForm } from "@/components/verify/verify-form";
import { AccountState, RoleKey } from "@/generated/prisma/enums";
import { loadCohortOptions } from "@/lib/cohorts-db";
import { db } from "@/lib/db";
import { namePartsOf } from "@/lib/names";
import { requireState } from "@/lib/session";
import { isBlobConfigured } from "@/lib/storage";
import {
  answersToFormState,
  type EvidenceItem,
  emptyFormState,
} from "@/lib/verification/schema";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "verify" });
  return { title: t("title") };
}

/** §14 screen 4 — verification form (first submission or NEEDS_INFO resubmission). */
export default async function VerifyPage({ params }: Props) {
  const { locale } = await params;
  const uiLocale = locale === "en" ? "en" : "ja";
  const user = await requireState(
    AccountState.EMAIL_VERIFIED,
    AccountState.NEEDS_INFO,
  );
  const t = await getTranslations("verify");

  const request = await db.verificationRequest.findUnique({
    where: { userId: user.id },
    include: { evidence: { orderBy: { createdAt: "asc" } } },
  });

  const evidence: EvidenceItem[] = (request?.evidence ?? []).map((e) => ({
    key: e.storageKey,
    fileName: e.fileName,
    mimeType: e.mimeType as EvidenceItem["mimeType"],
    size: e.size,
  }));

  const userNames = namePartsOf(user);
  const fromAnswers = request
    ? answersToFormState(request.answers, uiLocale, evidence)
    : null;
  const initial = fromAnswers
    ? {
        ...fromAnswers,
        ...(Object.fromEntries(
          Object.entries(userNames).map(([k, v]) => [
            k,
            fromAnswers[k as keyof typeof userNames] || v,
          ]),
        ) as typeof userNames),
      }
    : {
        ...emptyFormState(uiLocale),
        ...userNames,
        nameAtAis: user.nameAtAis ?? "",
        dateOfBirth: user.dateOfBirth
          ? user.dateOfBirth.toISOString().slice(0, 10)
          : "",
      };

  const teacher = user.roles.find((r) => r.role === RoleKey.TEACHER);
  const verifiedSchoolEmail =
    teacher?.schoolEmailVerified && teacher.schoolEmail
      ? teacher.schoolEmail
      : null;

  const needsInfo = user.state === AccountState.NEEDS_INFO;

  return (
    <>
      <PageHeader
        title={t("title")}
        description={needsInfo ? t("resubmitDescription") : t("description")}
      />
      {needsInfo ? (
        <div className="mb-6">
          <Alert tone="warning">
            <p className="font-semibold">{t("needsInfo.title")}</p>
            {request?.reviewNote ? (
              <p className="mt-1 whitespace-pre-line">{request.reviewNote}</p>
            ) : null}
          </Alert>
        </div>
      ) : null}
      <VerifyForm
        initial={initial}
        uiLocale={uiLocale}
        userId={user.id}
        useBlob={isBlobConfigured()}
        initialVerifiedSchoolEmail={verifiedSchoolEmail}
        cohorts={await loadCohortOptions(uiLocale)}
      />
    </>
  );
}
