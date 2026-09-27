import { getTranslations } from "next-intl/server";
import { revokeInviteAction } from "@/app/actions/invites";
import { InviteCreator } from "@/components/invites/invite-form";
import { Badge, Card, PageHeader } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { cohortShort } from "@/lib/cohorts";
import { loadCohortChoices } from "@/lib/cohorts-db";
import { db } from "@/lib/db";
import { asLocale } from "@/lib/events";
import { displayName, formatDate } from "@/lib/format";
import { requireActive } from "@/lib/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/invite">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "invites" });
  return { title: t("title") };
}

/** Invite alumni, parents and teachers with one-time links. */
export default async function InvitePage({
  params,
}: PageProps<"/[locale]/app/invite">) {
  const locale = asLocale((await params).locale);
  const me = await requireActive();
  const t = await getTranslations("invites");
  const [cohorts, invites] = await Promise.all([
    loadCohortChoices(locale),
    db.invite.findMany({
      where: { inviterId: me.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        cohort: { select: { number: true } },
        usedBy: { select: { nameRomaji: true, nameKanji: true } },
      },
    }),
  ]);
  const now = new Date();

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <Card>
        <InviteCreator cohorts={cohorts} />
      </Card>
      {invites.length ? (
        <Card>
          <h2 className="mb-3 text-lg font-semibold">{t("sent")}</h2>
          <ul className="divide-y divide-slate-100">
            {invites.map((i) => {
              const status = i.usedAt
                ? "used"
                : i.revokedAt
                  ? "revoked"
                  : i.expiresAt <= now
                    ? "expired"
                    : "open";
              return (
                <li
                  key={i.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                >
                  <span className="min-w-0">
                    <span className="font-medium">
                      {i.inviteeName || t(`types.${i.type}`)}
                    </span>
                    <span className="ml-2 text-slate-600">
                      {t(`types.${i.type}`)}
                      {i.cohort ? ` · ${cohortShort(i.cohort, locale)}` : ""}
                      {" · "}
                      {formatDate(i.createdAt, locale)}
                    </span>
                    {i.usedBy ? (
                      <span className="block text-slate-600">
                        {t("usedBy", { name: displayName(i.usedBy, locale) })}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge
                      tone={
                        status === "used"
                          ? "green"
                          : status === "open"
                            ? "brand"
                            : "slate"
                      }
                    >
                      {t(`status.${status}`)}
                    </Badge>
                    {status === "open" ? (
                      <form action={revokeInviteAction}>
                        <input type="hidden" name="id" value={i.id} />
                        <SubmitButton variant="ghost" className="px-2 text-xs">
                          {t("revoke")}
                        </SubmitButton>
                      </form>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
