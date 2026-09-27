import { CircleAlert, CircleCheck, MailPlus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { InviteType } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import { cohortShort } from "@/lib/cohorts";
import { displayName, formatDate } from "@/lib/format";
import { inviteMatches } from "@/lib/invites";

/**
 * Admin: the invitation this applicant used — who invited them and what the
 * inviter said (type, 学年) compared with the application.
 */
export async function InvitePanel({
  invite,
  answers,
  locale,
}: {
  invite: {
    type: InviteType;
    inviteeName: string | null;
    createdAt: Date;
    cohort: { number: number } | null;
    inviter: {
      id: string;
      nameRomaji: string | null;
      nameKanji: string | null;
    };
  };
  answers: unknown;
  locale: "ja" | "en";
}) {
  const t = await getTranslations("adminVerify.invite");
  const ti = await getTranslations("invites");
  const match = inviteMatches(
    { type: invite.type, cohortNumber: invite.cohort?.number ?? null },
    answers,
  );
  const tone =
    match === "match"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : match === "mismatch"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-slate-200 bg-slate-50 text-slate-800";
  return (
    <section
      aria-labelledby="invite-title"
      className={`space-y-2 rounded-xl border p-4 ${tone}`}
    >
      <h2 id="invite-title" className="flex items-center gap-2 font-semibold">
        <MailPlus aria-hidden="true" className="size-5" />
        {t("title")}
      </h2>
      <p className="text-sm">
        {t.rich("by", {
          name: () => (
            <Link
              href={`/app/admin/members/${invite.inviter.id}`}
              className="font-semibold underline"
            >
              {displayName(invite.inviter, locale)}
            </Link>
          ),
          date: formatDate(invite.createdAt, locale),
        })}
      </p>
      <p className="text-sm">
        {t("said", {
          what: `${ti(`types.${invite.type}`)}${invite.cohort ? `（${cohortShort(invite.cohort, locale)}）` : ""}`,
        })}
        {invite.inviteeName
          ? ` · ${t("name", { name: invite.inviteeName })}`
          : ""}
      </p>
      <p className="flex items-center gap-1.5 text-sm font-medium">
        {match === "match" ? (
          <CircleCheck aria-hidden="true" className="size-4" />
        ) : match === "mismatch" ? (
          <CircleAlert aria-hidden="true" className="size-4" />
        ) : null}
        {t(`match.${match}`)}
      </p>
    </section>
  );
}
