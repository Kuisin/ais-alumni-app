import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { verifyEmailAction } from "@/app/actions/onboarding";
import { Card, PageHeader } from "@/components/ui/card";
import { AccountState } from "@/generated/prisma/enums";
import { requireState } from "@/lib/session";
import { OtpEmailForm } from "../../auth/_components/otp-email-form";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/onboarding/email">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "onboarding" });
  return { title: t("email.title") };
}

/**
 * Mandatory email confirmation for LINE-first accounts (§4.2). Cannot be
 * skipped: every other screen redirects here while the state is UNVERIFIED_EMAIL.
 */
export default async function OnboardingEmailPage() {
  await requireState(AccountState.UNVERIFIED_EMAIL);
  const t = await getTranslations("onboarding");

  return (
    <>
      <PageHeader
        title={t("email.title")}
        description={t("email.description")}
      />
      <Card className="space-y-4">
        <OtpEmailForm
          action={verifyEmailAction}
          verifyLabel={t("email.verify")}
        />
        <p className="text-sm text-slate-600">
          {t("email.existingAccountNote")}
        </p>
      </Card>
    </>
  );
}
