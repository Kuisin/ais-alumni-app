import { UserRound } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { cancelGenderRequestAction } from "@/app/actions/gender-requests";
import { EditableCard } from "@/components/ui/view-edit";
import { ChangeRequestStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { isGender } from "@/lib/gender";
import type { CurrentUser } from "@/lib/session";
import { GenderRequestForm } from "./gender-request-form";
import { RequestStatus } from "./request-status";
import { ReachTag } from "./visibility";

/**
 * 性別, read-only once given (in the application), with a request to change
 * it and the status of the latest request. Members without one set it once.
 */
export async function GenderCard({ me }: { me: CurrentUser }) {
  const t = await getTranslations("profile.gender");
  const tp = await getTranslations("profile");
  const tg = await getTranslations("profile.photo.genders");
  const ts = await getTranslations("profile.nameRequest.status");
  const locale = (await getLocale()) === "en" ? "en" : "ja";
  const current = isGender(me.gender) ? me.gender : null;
  const latest = await db.genderRequest.findFirst({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
  });
  const pending = latest?.status === ChangeRequestStatus.PENDING;

  return (
    <EditableCard
      id="gender"
      icon={<UserRound />}
      title={t("title")}
      description={t("lockedNote")}
      editLabel={current ? tp("requestChange") : t("openSetOnce")}
      savedMessage={current ? tp("gender.submitted") : tp("gender.saved")}
      canEdit={!pending}
      view={
        <>
          <p className="text-lg font-medium">
            {current ? (
              tg(current)
            ) : (
              <span className="text-slate-500">{t("notSet")}</span>
            )}
          </p>
          <ReachTag reach="self" />
          {!current ? (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              {t("setOnceHint")}
            </p>
          ) : null}
          <RequestStatus
            latest={latest}
            pendingText={
              latest
                ? t("pendingSince", {
                    date: formatDate(latest.createdAt, locale),
                    value: isGender(latest.proposed)
                      ? tg(latest.proposed)
                      : latest.proposed,
                  })
                : ""
            }
            statusLabel={(s) => ts(s)}
            reviewNoteLabel={t("reviewNote")}
            withdrawLabel={t("cancel")}
            withdrawAction={cancelGenderRequestAction}
          />
        </>
      }
    >
      <GenderRequestForm current={current} />
    </EditableCard>
  );
}
