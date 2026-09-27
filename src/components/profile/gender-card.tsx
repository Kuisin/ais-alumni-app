import { UserRound } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { cancelGenderRequestAction } from "@/app/actions/gender-requests";
import { Badge, Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { ChangeRequestStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { isGender } from "@/lib/gender";
import type { CurrentUser } from "@/lib/session";
import { GenderRequestForm } from "./gender-request-form";

/**
 * 性別, read-only once given (in the application), with a request to change
 * it and the status of the latest request. Members without one set it once.
 */
export async function GenderCard({ me }: { me: CurrentUser }) {
  const t = await getTranslations("profile.gender");
  const tg = await getTranslations("profile.photo.genders");
  const ts = await getTranslations("profile.nameRequest.status");
  const locale = (await getLocale()) === "en" ? "en" : "ja";
  const current = isGender(me.gender) ? me.gender : null;
  const latest = await db.genderRequest.findFirst({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
  });
  const pending =
    latest?.status === ChangeRequestStatus.PENDING ? latest : null;

  return (
    <Card id="gender" className="scroll-mt-20 space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <UserRound aria-hidden="true" className="size-4 text-slate-500" />
          {t("title")}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{t("lockedNote")}</p>
      </div>
      <p className="text-lg font-medium">
        {current ? (
          tg(current)
        ) : (
          <span className="text-slate-500">{t("notSet")}</span>
        )}
      </p>
      {!current ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          {t("setOnceHint")}
        </p>
      ) : null}

      {pending ? (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="flex flex-wrap items-center gap-2 font-medium text-amber-900">
            <Badge tone="amber">{ts("PENDING")}</Badge>
            {t("pendingSince", {
              date: formatDate(pending.createdAt, locale),
              value: isGender(pending.proposed)
                ? tg(pending.proposed)
                : pending.proposed,
            })}
          </p>
          <form action={cancelGenderRequestAction}>
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
          <GenderRequestForm current={current} />
        </>
      )}
    </Card>
  );
}
