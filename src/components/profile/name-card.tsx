import { Lock } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { cancelNameRequestAction } from "@/app/actions/name-requests";
import { EditableCard } from "@/components/ui/view-edit";
import { ChangeRequestStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { namePartsOf } from "@/lib/names";
import type { CurrentUser } from "@/lib/session";
import { NameRequestForm } from "./name-request-form";
import { RequestStatus } from "./request-status";

/**
 * The member's name, read-only after approval, with a request to change it
 * (reviewed by the committee) and the status of the latest request.
 */
export async function NameCard({ me }: { me: CurrentUser }) {
  const t = await getTranslations("profile.nameRequest");
  const tp = await getTranslations("profile");
  const tn = await getTranslations("common.names");
  const locale = (await getLocale()) === "en" ? "en" : "ja";
  const latest = await db.nameChangeRequest.findFirst({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
  });
  const pending = latest?.status === ChangeRequestStatus.PENDING;
  const rows: [string, string | null][] = [
    [tn("romaji"), me.nameRomaji],
    [tn("kanjiShort"), me.nameKanji],
    [tn("kanaShort"), me.nameKana],
    [t("nameAtAis"), me.nameAtAis],
  ];

  return (
    <EditableCard
      id="name"
      icon={<Lock />}
      title={t("title")}
      description={t("lockedNote")}
      editLabel={tp("requestChange")}
      savedMessage={tp("nameRequest.submitted")}
      canEdit={!pending}
      view={
        <>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            {rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-sm text-slate-600">{label}</dt>
                <dd className="min-w-0 break-words">{value || "—"}</dd>
              </div>
            ))}
          </dl>
          <RequestStatus
            latest={latest}
            pendingText={
              latest
                ? t("pendingSince", {
                    date: formatDate(latest.createdAt, locale),
                  })
                : ""
            }
            statusLabel={(s) => t(`status.${s}`)}
            reviewNoteLabel={t("reviewNote")}
            withdrawLabel={t("cancel")}
            withdrawAction={cancelNameRequestAction}
          />
        </>
      }
    >
      <NameRequestForm
        values={{ ...namePartsOf(me), nameAtAis: me.nameAtAis ?? "" }}
      />
    </EditableCard>
  );
}
