import {
  Camera,
  ChevronRight,
  HeartHandshake,
  MailPlus,
  Settings,
  UserPlus,
} from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { FollowCounts } from "@/components/follows/follow-counts";
import { HistoryList } from "@/components/history/history-list";
import { AvatarForm } from "@/components/profile/avatar-form";
import { AvatarSettingsForm } from "@/components/profile/avatar-settings-form";
import { avatarSrc } from "@/components/profile/avatar-src";
import { BirthDateCard } from "@/components/profile/birth-date-card";
import { DirectorySettingsForm } from "@/components/profile/directory-settings-form";
import { FollowerFieldsForm } from "@/components/profile/follower-fields-form";
import { GenderCard } from "@/components/profile/gender-card";
import { NameCard } from "@/components/profile/name-card";
import { ProfileForm } from "@/components/profile/profile-form";
import { AisRecord } from "@/components/profile/role-details";
import {
  parseSocialLinks,
  SOCIAL_KEYS,
} from "@/components/profile/social-links";
import { ReachTag, ViewAsLinks } from "@/components/profile/visibility";
import { Avatar } from "@/components/ui/avatar";
import { Badge, Card } from "@/components/ui/card";
import { LinkPendingIcon } from "@/components/ui/link-pending";
import { CardLink, EditableCard } from "@/components/ui/view-edit";
import { FollowStatus, type Locale, RoleKey } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import { roleLabelKey } from "@/lib/audience";
import { defaultAvatar } from "@/lib/avatar";
import { db } from "@/lib/db";
import { PARENT_ROLES } from "@/lib/directory";
import { loadFollowCounts } from "@/lib/follows";
import { displayName, otherNames } from "@/lib/format";
import {
  followerFieldSet,
  PERSONAL_FIELDS,
  type PersonalField,
} from "@/lib/personal-fields";
import {
  personalReach,
  photoReach,
  type Reach,
} from "@/lib/profile-visibility";
import { requireActive } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile");
  return { title: t("title") };
}

/** Label / value rows of a section's view. */
function Rows({ children }: { children: ReactNode }) {
  return (
    <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-[10rem_1fr]">
      {children}
    </dl>
  );
}
function Row({
  label,
  reach,
  children,
}: {
  label: string;
  /** who sees it (「公開範囲」 chips under the value) */
  reach?: Reach;
  children: ReactNode;
}) {
  return (
    <div className="sm:contents">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className="min-w-0 break-words">
        {children}
        {reach ? <ReachTag reach={reach} /> : null}
      </dd>
    </div>
  );
}

/**
 * My profile (§10.2): what others see, section by section, each with its
 * own 編集 button that opens the form in place. Locked fields (name, birth
 * date, gender) open a request to the committee instead; history and the
 * AIS record are edited on their own pages.
 */
export default async function MyProfilePage() {
  const me = await requireActive();
  const t = await getTranslations("profile");
  const tr = await getTranslations("roles");
  const tc = await getTranslations("common");
  const tv = await getTranslations("profile.visibility");
  const locale = (await getLocale()) as Locale;
  const name = displayName(me, locale);
  const altName = otherNames(me);
  const former = me.roles.find((r) => r.role === RoleKey.FORMER_STUDENT);
  const parent = me.roles.some((r) => PARENT_ROLES.includes(r.role));
  const social = parseSocialLinks(me.socialLinks);
  const sharedSet = followerFieldSet(me.followerFields);
  const shared = [...sharedSet];
  const reachOf = (f: PersonalField) => personalReach(f, sharedSet);
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
  const [counts, followRequests, education, work] = await Promise.all([
    loadFollowCounts(me.id),
    db.follow.count({
      where: { followeeId: me.id, status: FollowStatus.REQUESTED },
    }),
    db.educationEntry.findMany({
      where: { userId: me.id },
      include: { school: true },
    }),
    db.workEntry.findMany({
      where: { userId: me.id },
      include: { company: true },
    }),
  ]);
  const photo = avatarSrc(me.avatarUrl);
  const notSet = <span className="text-slate-500">{tc("notSet")}</span>;

  const accountLinks = [
    {
      href: "/app/follows",
      label: tc("nav.follows"),
      icon: <UserPlus className="size-5" />,
      count: followRequests,
    },
    {
      href: "/app/family",
      label: tc("nav.family"),
      icon: <HeartHandshake className="size-5" />,
    },
    {
      href: "/app/invite",
      label: tc("nav.invite"),
      icon: <MailPlus className="size-5" />,
    },
    {
      href: "/app/settings",
      label: tc("nav.settings"),
      icon: <Settings className="size-5" />,
    },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* What other members see at the top of my profile. */}
      <Card>
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
          <div className="relative shrink-0">
            <Avatar
              src={photo ?? defaultAvatar(me.gender)}
              name={name}
              size={96}
            />
            <a
              href="#edit-photo"
              aria-label={t("photo.change")}
              className="absolute -right-1 -bottom-1 inline-flex size-11 items-center justify-center rounded-full border-4 border-white bg-brand-700 text-white shadow hover:bg-brand-800"
            >
              <Camera aria-hidden="true" className="size-4" />
            </a>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight break-words">
              {name}
            </h1>
            {altName ? <p className="text-slate-600">{altName}</p> : null}
            {me.nameAtAis ? (
              <p className="text-sm text-slate-600">
                {t("nameAtAisValue", { name: me.nameAtAis })}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap justify-center gap-1 sm:justify-start">
              {me.roles.map((r) => (
                <Badge key={r.role} tone="brand">
                  {tr(roleLabelKey(r))}
                </Badge>
              ))}
            </div>
            <FollowCounts
              followers={counts.followers}
              following={counts.following}
              linked
            />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">{tv("title")}</h2>
        <p className="mt-1 text-sm text-slate-600">{tv("intro")}</p>
        <p className="mt-3 mb-2 text-sm font-medium">{tv("viewAsTitle")}</p>
        <ViewAsLinks memberId={me.id} />
      </Card>

      <EditableCard
        id="about"
        title={t("sections.about")}
        view={
          <Rows>
            <Row label={t("fields.bio")} reach="members">
              {me.bio ? (
                <span className="whitespace-pre-line">{me.bio}</span>
              ) : (
                <span className="text-slate-500">{t("emptyPrompt.bio")}</span>
              )}
            </Row>
            <Row label={t("fields.phone")} reach={reachOf("phone")}>
              {me.phone || notSet}
            </Row>
            {SOCIAL_KEYS.filter((k) => social[k]).map((k) => (
              <Row key={k} label={t(`fields.${k}`)} reach={reachOf(k)}>
                <span className="break-all">{social[k]}</span>
              </Row>
            ))}
            {former ? (
              <Row label={t("sections.follows")} reach="self">
                {t("autoAccept.label")}:{" "}
                <strong>{me.autoAcceptSameYear ? tc("on") : tc("off")}</strong>
              </Row>
            ) : null}
          </Rows>
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
      </EditableCard>

      {parent ? (
        <EditableCard
          id="directory"
          title={t("directory.title")}
          view={
            <p>
              {me.hideFromDirectory
                ? t("directory.hidden")
                : t("directory.shown")}
            </p>
          }
        >
          <DirectorySettingsForm listed={!me.hideFromDirectory} />
        </EditableCard>
      ) : null}

      <EditableCard
        id="photo"
        title={t("sections.photo")}
        view={
          <Rows>
            <Row
              label={t("photo.visibility")}
              reach={photoReach(me.avatarPublic)}
            >
              {me.avatarPublic ? t("photo.everyone") : t("photo.onlyConnected")}
            </Row>
          </Rows>
        }
      >
        <div className="space-y-5">
          <AvatarForm
            src={photo}
            fallback={defaultAvatar(me.gender)}
            name={name}
          />
          <div className="border-t border-slate-100 pt-4">
            <AvatarSettingsForm avatarPublic={me.avatarPublic} />
          </div>
        </div>
      </EditableCard>

      <EditableCard
        id="follower-fields"
        title={t("followerFields.title")}
        description={t("hints.privateTier")}
        view={
          // Only what is shared; the full list of switches is in the form.
          shared.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {PERSONAL_FIELDS.filter((f) => shared.includes(f)).map((f) => (
                <li key={f}>
                  <Badge tone="brand">{t(`followerFields.fields.${f}`)}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-600">
              {t("followerFields.noneShared")}
            </p>
          )
        }
      >
        <FollowerFieldsForm shared={shared} values={personal} />
      </EditableCard>

      <EditableCard
        id="history"
        title={t("sections.history")}
        action={<CardLink href="/app/profile/history">{tc("edit")}</CardLink>}
        view={
          education.length || work.length ? (
            <HistoryList education={education} work={work} showReach />
          ) : (
            <p className="text-sm text-slate-500">{t("historyIntro")}</p>
          )
        }
      />

      {former ? (
        <EditableCard
          id="stage"
          title={t("sections.currentStage")}
          description={t("stage.fromHistory")}
          view={
            <p>
              {former.currentStage ? (
                <>
                  <span className="font-medium">
                    {tr(`stage.${former.currentStage}`)}
                  </span>
                  <ReachTag reach="members" />
                  {former.currentStageDetail ? (
                    <span className="mt-2 block text-slate-600">
                      {former.currentStageDetail}
                      <ReachTag reach={reachOf("currentStageDetail")} />
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="text-slate-500">{t("stage.none")}</span>
              )}
            </p>
          }
        />
      ) : null}

      <EditableCard
        id="record"
        title={t("sections.aisRecord")}
        description={t("recordReadOnly")}
        action={
          <CardLink href="/app/profile/record">
            {t("requestCorrection")}
          </CardLink>
        }
        view={
          <>
            <AisRecord roles={me.roles} />
            <ReachTag reach="members" />
          </>
        }
      />

      <NameCard me={me} />
      <BirthDateCard me={me} />
      <GenderCard me={me} />

      <EditableCard
        id="account"
        title={t("sections.account")}
        action={
          <CardLink href="/app/settings#email">
            {t("changeInSettings")}
          </CardLink>
        }
        view={
          <>
            <Rows>
              <Row label={t("fields.email")} reach={reachOf("email")}>
                <span className="break-all">{me.primaryEmail || "—"}</span>
                <span className="mt-0.5 block text-sm text-slate-500">
                  {t("emailHint")}
                </span>
              </Row>
              {me.lineDisplayName ? (
                <Row
                  label={t("fields.lineDisplayName")}
                  reach={reachOf("lineDisplayName")}
                >
                  {me.lineDisplayName}
                </Row>
              ) : null}
            </Rows>
            <ul className="-mx-2 divide-y divide-slate-100 border-t border-slate-100 pt-1">
              {accountLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="flex min-h-12 items-center gap-3 rounded-lg px-2 text-slate-800 hover:bg-slate-50"
                  >
                    <span aria-hidden="true" className="text-brand-700">
                      {l.icon}
                    </span>
                    <span className="flex-1 font-medium">{l.label}</span>
                    {l.count ? (
                      <Badge tone="amber">
                        {tc("nav.pending", { count: l.count })}
                      </Badge>
                    ) : null}
                    <LinkPendingIcon>
                      <ChevronRight
                        aria-hidden="true"
                        className="size-5 text-slate-400"
                      />
                    </LinkPendingIcon>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        }
      />
    </div>
  );
}
