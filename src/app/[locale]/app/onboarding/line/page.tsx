import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { skipLineOnboardingAction } from "@/app/actions/onboarding";
import { LineLinkPanel } from "@/components/line/line-link-panel";
import { buttonClass } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { AccountState } from "@/generated/prisma/enums";
import { redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { parseLinkOutcome } from "@/lib/line-link";
import { requireState } from "@/lib/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/onboarding/line">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "onboarding" });
  return { title: t("line.title") };
}

/** Optional "Get updates on LINE" step after email verification (§5.2, §14 screen 3). */
export default async function OnboardingLinePage({
  params,
  searchParams,
}: PageProps<"/[locale]/app/onboarding/line">) {
  const { locale } = await params;
  const user = await requireState(AccountState.EMAIL_VERIFIED);
  if (user.lineOnboardingSeenAt)
    return redirect({ href: "/app/onboarding/verify", locale });

  // Already linked and following (e.g. just came back from linking): nothing
  // left to do here, so record the step as seen and move on.
  if (user.lineUserId && user.lineFollowing) {
    await db.user.update({
      where: { id: user.id },
      data: { lineOnboardingSeenAt: new Date() },
    });
    return redirect({ href: "/app/onboarding/verify", locale });
  }

  const outcome = parseLinkOutcome((await searchParams).line);
  const t = await getTranslations("onboarding");

  return (
    <>
      <PageHeader title={t("line.title")} description={t("line.description")} />
      <Card className="space-y-5">
        <ul className="space-y-2 text-sm text-slate-700">
          {(["reminders", "news", "result"] as const).map((key) => (
            <li key={key} className="flex gap-2">
              <span
                aria-hidden="true"
                className="mt-1.5 inline-block size-2 shrink-0 rounded-full bg-line"
              />
              {t(`line.benefits.${key}`)}
            </li>
          ))}
        </ul>
        <LineLinkPanel
          userId={user.id}
          returnTo="/app/onboarding/line"
          outcome={outcome}
        />
        <p className="text-xs text-slate-500">{t("line.emailFallback")}</p>
      </Card>
      <form action={skipLineOnboardingAction} className="mt-4 flex justify-end">
        <button
          type="submit"
          className={buttonClass(
            user.lineUserId ? "primary" : "secondary",
            "w-full sm:w-auto",
          )}
        >
          {user.lineUserId ? t("line.continue") : t("line.skip")}
        </button>
      </form>
    </>
  );
}
