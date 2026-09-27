import { Cake } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { cancelBirthDateRequestAction } from "@/app/actions/birth-date-requests";
import { EditableCard } from "@/components/ui/view-edit";
import { ChangeRequestStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import type { CurrentUser } from "@/lib/session";
import { BirthDateRequestForm } from "./birth-date-request-form";
import { RequestStatus } from "./request-status";

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
  const tp = await getTranslations("profile");
  const ts = await getTranslations("profile.nameRequest.status");
  const locale = (await getLocale()) === "en" ? "en" : "ja";
  const latest = await db.birthDateRequest.findFirst({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
  });
  const pending = latest?.status === ChangeRequestStatus.PENDING;

  return (
    <EditableCard
      id="birth-date"
      icon={<Cake />}
      title={t("title")}
      description={t("lockedNote")}
      editLabel={me.dateOfBirth ? tp("requestChange") : tp("requestAdd")}
      savedMessage={tp("birthDate.submitted")}
      canEdit={!pending}
      view={
        <>
          <p className="text-lg font-medium">
            {me.dateOfBirth ? (
              formatBirthDate(me.dateOfBirth, locale)
            ) : (
              <span className="text-slate-500">{t("notSet")}</span>
            )}
          </p>
          {!me.dateOfBirth && !pending ? (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              {t("notSetHint")}
            </p>
          ) : null}
          <RequestStatus
            latest={latest}
            pendingText={
              latest
                ? t("pendingSince", {
                    date: formatDate(latest.createdAt, locale),
                    value: formatBirthDate(latest.proposed, locale),
                  })
                : ""
            }
            statusLabel={(s) => ts(s)}
            reviewNoteLabel={t("reviewNote")}
            withdrawLabel={t("cancel")}
            withdrawAction={cancelBirthDateRequestAction}
          />
        </>
      }
    >
      <BirthDateRequestForm
        current={
          me.dateOfBirth ? me.dateOfBirth.toISOString().slice(0, 10) : ""
        }
      />
    </EditableCard>
  );
}
