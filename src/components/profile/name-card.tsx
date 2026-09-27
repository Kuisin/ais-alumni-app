import { Lock } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { cancelNameRequestAction } from "@/app/actions/name-requests";
import { Badge, Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { ChangeRequestStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { namePartsOf } from "@/lib/names";
import type { CurrentUser } from "@/lib/session";
import { NameRequestForm } from "./name-request-form";

/**
 * The member's name, read-only after approval, with a request to change it
 * (reviewed by the committee) and the status of the latest request.
 */
export async function NameCard({ me }: { me: CurrentUser }) {
  const t = await getTranslations("profile.nameRequest");
  const tn = await getTranslations("common.names");
  const locale = (await getLocale()) === "en" ? "en" : "ja";
  const latest = await db.nameChangeRequest.findFirst({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
  });
  const pending =
    latest?.status === ChangeRequestStatus.PENDING ? latest : null;
  const rows: [string, string | null][] = [
    [tn("romaji"), me.nameRomaji],
    [tn("kanjiShort"), me.nameKanji],
    [tn("kanaShort"), me.nameKana],
    [t("nameAtAis"), me.nameAtAis],
  ];

  return (
    <Card id="name" className="scroll-mt-20 space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Lock aria-hidden="true" className="size-4 text-slate-500" />
          {t("title")}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{t("lockedNote")}</p>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-slate-600">{label}</dt>
            <dd>{value || "—"}</dd>
          </div>
        ))}
      </dl>

      {pending ? (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="flex flex-wrap items-center gap-2 font-medium text-amber-900">
            <Badge tone="amber">{t("status.PENDING")}</Badge>
            {t("pendingSince", { date: formatDate(pending.createdAt, locale) })}
          </p>
          <form action={cancelNameRequestAction}>
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
                {t(`status.${latest.status}`)}
              </Badge>
              {latest.reviewNote ? (
                <span>
                  {t("reviewNote")}: {latest.reviewNote}
                </span>
              ) : null}
            </p>
          ) : null}
          <NameRequestForm
            values={{ ...namePartsOf(me), nameAtAis: me.nameAtAis ?? "" }}
          />
        </>
      )}
    </Card>
  );
}
