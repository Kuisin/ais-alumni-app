import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Fragment } from "react";
import { AvatarForm } from "@/components/profile/avatar-form";
import { AvatarSettingsForm } from "@/components/profile/avatar-settings-form";
import { avatarSrc } from "@/components/profile/avatar-src";
import { BirthDateCard } from "@/components/profile/birth-date-card";
import { FollowerFieldsForm } from "@/components/profile/follower-fields-form";
import { GenderCard } from "@/components/profile/gender-card";
import { NameCard } from "@/components/profile/name-card";
import { ProfileForm } from "@/components/profile/profile-form";
import { AisRecord } from "@/components/profile/role-details";
import {
  parseSocialLinks,
  SOCIAL_KEYS,
} from "@/components/profile/social-links";
import { buttonClass } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { ViewEdit } from "@/components/ui/view-edit";
import { type Locale, RoleKey } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import { defaultAvatar } from "@/lib/avatar";
import { displayName } from "@/lib/format";
import {
  followerFieldSet,
  PERSONAL_FIELDS,
  type PersonalField,
} from "@/lib/personal-fields";
import { requireActive } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile");
  return { title: t("editTitle") };
}

/** Own profile edit (§10.2). The user's own data, so private fields are fine. */
export default async function ProfileEditPage() {
  const me = await requireActive();
  const t = await getTranslations("profile");
  const tr = await getTranslations("roles");
  const tc = await getTranslations("common");
  const locale = (await getLocale()) as Locale;
  const former = me.roles.find((r) => r.role === RoleKey.FORMER_STUDENT);
  const social = parseSocialLinks(me.socialLinks);
  const shared = [...followerFieldSet(me.followerFields)];
  const personal: Record<PersonalField, string | null> = {
    email: me.primaryEmail,
    phone: me.phone,
    lineDisplayName: me.lineDisplayName,
    instagram: social.instagram ?? null,
    linkedin: social.linkedin ?? null,
    facebook: social.facebook ?? null,
    x: social.x ?? null,
    website: social.website ?? null,
    currentStageDetail: former?.currentStageDetail ?? null,
  };

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

      <Card className="space-y-5">
        <h2 className="text-lg font-semibold">{t("sections.photo")}</h2>
        <AvatarForm
          src={avatarSrc(me.avatarUrl)}
          fallback={defaultAvatar(me.gender)}
          name={displayName(me, locale)}
        />
        <div id="photo-settings" className="border-t border-slate-100 pt-4">
          <ViewEdit
            actionsClassName="flex justify-end"
            view={
              <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
                <dt className="font-medium text-slate-600">
                  {t("photo.visibility")}
                </dt>
                <dd>
                  {me.avatarPublic
                    ? t("photo.everyone")
                    : t("photo.onlyConnected")}
                </dd>
              </dl>
            }
          >
            <AvatarSettingsForm avatarPublic={me.avatarPublic} />
          </ViewEdit>
        </div>
      </Card>

      <NameCard me={me} />

      <BirthDateCard me={me} />

      <GenderCard me={me} />

      <ViewEdit
        actionsClassName="flex justify-end"
        view={
          <Card>
            <dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-[10rem_1fr]">
              <dt className="font-medium text-slate-600">{t("fields.bio")}</dt>
              <dd className="whitespace-pre-line break-words">
                {me.bio || (
                  <span className="text-slate-500">{tc("notSet")}</span>
                )}
              </dd>
              <dt className="font-medium text-slate-600">
                {t("fields.phone")}
              </dt>
              <dd>
                {me.phone || (
                  <span className="text-slate-500">{tc("notSet")}</span>
                )}
              </dd>
              {SOCIAL_KEYS.filter((k) => social[k]).map((k) => (
                <Fragment key={k}>
                  <dt className="font-medium text-slate-600">
                    {t(`fields.${k}`)}
                  </dt>
                  <dd className="break-all">{social[k]}</dd>
                </Fragment>
              ))}
              {former ? (
                <>
                  <dt className="font-medium text-slate-600">
                    {t("sections.follows")}
                  </dt>
                  <dd>
                    {t("autoAccept.label")}:{" "}
                    <strong>
                      {me.autoAcceptSameYear ? tc("on") : tc("off")}
                    </strong>
                  </dd>
                </>
              ) : null}
            </dl>
          </Card>
        }
      >
        <ProfileForm
          showAutoAccept={Boolean(former)}
          values={{
            bio: me.bio ?? "",
            phone: me.phone ?? "",
            autoAcceptSameYear: me.autoAcceptSameYear,
            social,
          }}
        />
      </ViewEdit>

      <section id="follower-fields" aria-labelledby="follower-fields-title">
        <h2 id="follower-fields-title" className="mb-2 text-lg font-semibold">
          {t("followerFields.title")}
        </h2>
        <ViewEdit
          actionsClassName="flex justify-end"
          view={
            <Card>
              <p className="mb-3 text-sm text-slate-600">
                {t("hints.privateTier")}
              </p>
              <ul className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                {PERSONAL_FIELDS.map((f) => (
                  <li
                    key={f}
                    className="flex items-center justify-between gap-2"
                  >
                    <span>{t(`followerFields.fields.${f}`)}</span>
                    <span
                      className={
                        shared.includes(f)
                          ? "rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-800"
                          : "rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                      }
                    >
                      {shared.includes(f) ? tc("on") : tc("off")}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          }
        >
          <Card>
            <FollowerFieldsForm shared={shared} values={personal} />
          </Card>
        </ViewEdit>
      </section>

      {former ? (
        <Card id="stage" className="scroll-mt-20">
          <h2 className="mb-3 text-lg font-semibold">
            {t("sections.currentStage")}
          </h2>
          {/* 現在の状況 is worked out from 学歴・職歴 (src/lib/stage.ts). */}
          <p className="text-slate-900">
            {former.currentStage ? (
              <>
                <span className="font-medium">
                  {tr(`stage.${former.currentStage}`)}
                </span>
                {former.currentStageDetail ? (
                  <span className="text-slate-600">
                    {" "}
                    — {former.currentStageDetail}
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-slate-600">{t("stage.none")}</span>
            )}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {t("stage.fromHistory")}
          </p>
          <Link
            href="/app/profile/history"
            className={buttonClass("secondary", "mt-3")}
          >
            {t("stage.editHistory")}
          </Link>
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
