import { Cake } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { cancelBirthDateRequestAction } from "@/app/actions/birth-date-requests";
import { Badge, Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { ChangeRequestStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import type { CurrentUser } from "@/lib/session";
import { BirthDateRequestForm } from "./birth-date-request-form";

/** The member's birth date (UTC midnight → that calendar day). */
export function formatBirthDate(d: Date, locale: "ja" | "en"): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

/**
 * Date of birth, read-only after approval, with a request to add or correct
 * it (reviewed by the committee) and the status of the latest request.
 */
export async function BirthDateCard({ me }: { me: CurrentUser }) {
  const t = await getTranslations("profile.birthDate");
  const ts = await getTranslations("profile.nameRequest.status");
  const locale = (await getLocale()) === "en" ? "en" : "ja";
  const latest = await db.birthDateRequest.findFirst({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
  });
  const pending =
    latest?.status === ChangeRequestStatus.PENDING ? latest : null;

  return (
    <Card id="birth-date" className="scroll-mt-20 space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Cake aria-hidden="true" className="size-4 text-slate-500" />
          {t("title")}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{t("lockedNote")}</p>
      </div>
      <p className="text-lg font-medium">
        {me.dateOfBirth ? (
          formatBirthDate(me.dateOfBirth, locale)
        ) : (
          <span className="text-slate-500">{t("notSet")}</span>
        )}
      </p>
      {!me.dateOfBirth ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          {t("notSetHint")}
        </p>
      ) : null}

      {pending ? (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="flex flex-wrap items-center gap-2 font-medium text-amber-900">
            <Badge tone="amber">{ts("PENDING")}</Badge>
            {t("pendingSince", {
              date: formatDate(pending.createdAt, locale),
              value: formatBirthDate(pending.proposed, locale),
            })}
          </p>
          <form action={cancelBirthDateRequestAction}>
            <input type="hidden" name="id" value={pending.id} />
            <SubmitButton variant="secondary" className="px-3 text-xs">
              {t("cancel")}
            </SubmitButton>
          </form>
        </div>
      ) : (
        <>
          {latest && latest.status !== ChangeRequestStatus.CANCELLED ? (
            <p className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
              <Badge
                tone={
                  latest.status === ChangeRequestStatus.APPROVED
                    ? "green"
                    : "red"
                }
              >
                {ts(latest.status)}
              </Badge>
              {latest.reviewNote ? (
                <span>
                  {t("reviewNote")}: {latest.reviewNote}
                </span>
              ) : null}
            </p>
          ) : null}
          <BirthDateRequestForm
            current={
              me.dateOfBirth ? me.dateOfBirth.toISOString().slice(0, 10) : ""
            }
          />
        </>
      )}
    </Card>
  );
}
