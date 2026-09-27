import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { AvatarForm } from "@/components/profile/avatar-form";
import { avatarSrc } from "@/components/profile/avatar-src";
import { NameCard } from "@/components/profile/name-card";
import { ProfileForm } from "@/components/profile/profile-form";
import { AisRecord } from "@/components/profile/role-details";
import { parseSocialLinks } from "@/components/profile/social-links";
import { StageForm } from "@/components/profile/stage-form";
import { buttonClass } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { type Locale, RoleKey } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import { displayName, formatDate } from "@/lib/format";
import { requireActive } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile");
  return { title: t("editTitle") };
}

/** Own profile edit (§10.2). The user's own data, so private fields are fine. */
export default async function ProfileEditPage() {
  const me = await requireActive();
  const t = await getTranslations("profile");
  const locale = (await getLocale()) as Locale;
  const former = me.roles.find((r) => r.role === RoleKey.FORMER_STUDENT);
  const social = parseSocialLinks(me.socialLinks);

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("editTitle")}
        actions={
          <Link
            href={`/app/members/${me.id}`}
            className={buttonClass("secondary")}
          >
            {t("viewMyProfile")}
          </Link>
        }
      />

      <Card>
        <h2 className="mb-3 text-lg font-semibold">{t("sections.photo")}</h2>
        <AvatarForm
          src={avatarSrc(me.avatarUrl)}
          name={displayName(me, locale)}
        />
      </Card>

      <NameCard me={me} />

      <ProfileForm
        showAutoAccept={Boolean(former)}
        values={{
          bio: me.bio ?? "",
          phone: me.phone ?? "",
          autoAcceptSameYear: me.autoAcceptSameYear,
          social,
        }}
      />

      {former ? (
        <Card id="stage" className="scroll-mt-20">
          <h2 className="mb-3 text-lg font-semibold">
            {t("sections.currentStage")}
          </h2>
          <StageForm
            stage={former.currentStage}
            detail={former.currentStageDetail ?? ""}
            updatedLabel={
              former.currentStageUpdatedAt
                ? formatDate(former.currentStageUpdatedAt, locale)
                : null
            }
          />
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-1 text-lg font-semibold">
          {t("sections.aisRecord")}
        </h2>
        <p className="mb-3 text-sm text-slate-600">{t("recordReadOnly")}</p>
        <AisRecord roles={me.roles} />
        <Link
          href="/app/profile/record"
          className={buttonClass("secondary", "mt-4")}
        >
          {t("requestRecordCorrection")}
        </Link>
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-semibold">{t("sections.history")}</h2>
        <p className="mb-3 text-sm text-slate-600">{t("historyIntro")}</p>
        <Link href="/app/profile/history" className={buttonClass("secondary")}>
          {t("editHistory")}
        </Link>
      </Card>

      <Card>
        <p className="text-slate-700">{t("settingsLink")}</p>
        <Link href="/app/settings" className={buttonClass("secondary", "mt-3")}>
          {t("goSettings")}
        </Link>
      </Card>
    </div>
  );
}
