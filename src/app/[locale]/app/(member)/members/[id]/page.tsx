import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { MessageButton } from "@/components/chat/start-talk";
import { BlockControl } from "@/components/follows/block-control";
import { FollowButton } from "@/components/follows/follow-button";
import { FollowCounts } from "@/components/follows/follow-counts";
import { MemberMenu } from "@/components/follows/member-menu";
import { HistoryList } from "@/components/history/history-list";
import { formatBirthDate } from "@/components/profile/birth-date-card";
import { AisRecord } from "@/components/profile/role-details";
import {
  parseSocialLinks,
  SOCIAL_KEYS,
} from "@/components/profile/social-links";
import { HiddenFields, ViewAsLinks } from "@/components/profile/visibility";
import { Avatar } from "@/components/ui/avatar";
import { Alert, Badge, Card } from "@/components/ui/card";
import { HistoryBackLink } from "@/components/ui/history-back-link";
import { FollowStatus, type Locale, RoleKey } from "@/generated/prisma/enums";
import { Link, redirect } from "@/i18n/navigation";
import { roleLabelKey } from "@/lib/audience";
import {
  canRequestFollow,
  getProfileForViewer,
  type ProfileView,
  projectPrivate,
  projectPublic,
  sameFamily,
  toViewer,
} from "@/lib/authz";
import {
  defaultAvatar,
  loadConnections,
  photoVisible,
  storedAvatarUrl,
} from "@/lib/avatar";
import { directChatDenial } from "@/lib/chat-db";
import { db } from "@/lib/db";
import {
  type FollowUiState,
  followButtonState,
  followsMe,
  loadFollowCounts,
  loadFollowStatus,
} from "@/lib/follows";
import { displayName, otherNames } from "@/lib/format";
import { visibleHistory } from "@/lib/history";
import { followerFieldSet } from "@/lib/personal-fields";
import {
  type Audience,
  hiddenPersonalFields,
  isAudience,
  photoReach,
  previewAccess,
  seenBy,
} from "@/lib/profile-visibility";
import { type CurrentUser, requireActive } from "@/lib/session";

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ as?: string }>;
};

/** My own profile as an audience would see it (「〇〇として見る」). */
function previewView(me: CurrentUser, as: Audience): ProfileView {
  return {
    public: projectPublic(me),
    private: projectPrivate(me, previewAccess(as)),
    access: previewAccess(as),
    hiddenFields: hiddenPersonalFields(
      previewAccess(as),
      followerFieldSet(me.followerFields),
    ),
    sharesWithFollowers: followerFieldSet(me.followerFields).size > 0,
    relationship: {
      follow: as === "followers" ? FollowStatus.ACCEPTED : null,
      blocked: false,
    },
    isSelf: false,
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile");
  return { title: t("title") };
}

export default async function MemberProfilePage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const { as } = await searchParams;
  const me = await requireActive();
  // My own profile (with its edit buttons) lives at /app/profile; here only
  // as a preview of what members / followers / family see.
  const preview = id === me.id && isAudience(as) ? as : null;
  if (id === me.id && !preview)
    redirect({ href: "/app/profile", locale: await getLocale() });
  const view = preview
    ? previewView(me, preview)
    : await getProfileForViewer(me, id);
  if (!view) notFound();
  // 学歴・職歴: "followers only" entries need follower or family access.
  const [education, work] = await Promise.all([
    db.educationEntry.findMany({
      where: { userId: id },
      include: { school: true },
    }),
    db.workEntry.findMany({
      where: { userId: id },
      include: { company: true },
    }),
  ]);
  const history = {
    education: visibleHistory(education, view.access !== "none"),
    work: visibleHistory(work, view.access !== "none"),
  };
  const hiddenHistory =
    education.length +
    work.length -
    history.education.length -
    history.work.length;

  const t = await getTranslations("profile");
  const tf = await getTranslations("follows");
  const tc = await getTranslations("common");
  const tr = await getTranslations("roles");
  const tv = await getTranslations("profile.visibility");
  const locale = (await getLocale()) as Locale;
  const p = view.public;
  const name = displayName(p, locale);
  const altName = otherNames(p);

  // Non-private columns needed to decide which relationship controls to show.
  const [counts, theirFollow] = await Promise.all([
    loadFollowCounts(id),
    view.isSelf || preview ? null : loadFollowStatus(id, me.id),
  ]);
  const [targetMeta, myBlock] =
    view.isSelf || preview
      ? [null, null]
      : await Promise.all([
          db.user.findUnique({
            where: { id },
            select: {
              id: true,
              state: true,
              familyId: true,
              dateOfBirth: true,
              managedById: true,
              roles: { select: { role: true } },
            },
          }),
          db.block.findUnique({
            where: { blockerId_blockedId: { blockerId: me.id, blockedId: id } },
            select: { id: true },
          }),
        ]);
  if (!view.isSelf && !preview && !targetMeta) notFound();
  const birthDate = view.isSelf ? me.dateOfBirth : targetMeta?.dateOfBirth;
  const tb = await getTranslations("profile.birthDate");
  const lang = (await getLocale()) === "en" ? "en" : "ja";
  // 1:1 talk with mutual followers (like LINE friends).
  const canMessage =
    !view.isSelf && !preview && (await directChatDenial(me.id, id)) === null;

  const family = preview
    ? preview === "family"
    : targetMeta
      ? sameFamily(me, targetMeta)
      : false;
  let followState: FollowUiState | null = null;
  if (targetMeta && !family && !myBlock) {
    const rel = view.relationship;
    const { managedById, ...meta } = targetMeta;
    const check = canRequestFollow(
      toViewer(me),
      {
        ...meta,
        managed: managedById !== null,
        roles: targetMeta.roles.map((r) => r.role),
      },
      rel,
    );
    followState = followButtonState(rel.follow, theirFollow, check.ok);
  }
  const canRequest = followState === "none" || followState === "followBack";

  const former = p.roles.find((r) => r.role === RoleKey.FORMER_STUDENT);
  const photoShown = preview
    ? seenBy(photoReach(p.avatarPublic), preview)
    : photoVisible(await loadConnections(me.id), {
        ...p,
        familyId: targetMeta?.familyId ?? null,
      });
  const photo =
    (photoShown ? storedAvatarUrl(p.avatarUrl) : null) ??
    defaultAvatar(p.gender);
  const priv = view.private;
  const social = priv ? parseSocialLinks(priv.socialLinks) : {};
  // Named rather than silently left out (no values: only which fields).
  const showBirthDate = view.isSelf || (me.isAdmin && !preview);
  const hiddenLabels = [
    ...(showBirthDate ? [] : [tb("title")]),
    ...view.hiddenFields.map((f) => t(`followerFields.fields.${f}`)),
  ];
  const hasContact = Boolean(
    priv &&
      (priv.email ||
        priv.phone ||
        priv.lineDisplayName ||
        Object.keys(social).length),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {preview ? (
        <Alert tone="info">
          <p className="font-semibold">{tv(`previewTitle.${preview}`)}</p>
          <p className="mt-1">{tv("previewHint")}</p>
          <div className="mt-3">
            <ViewAsLinks memberId={me.id} current={preview} />
          </div>
          <Link
            href="/app/profile"
            className="mt-3 inline-block font-medium underline"
          >
            {tv("backToProfile")}
          </Link>
        </Alert>
      ) : (
        <div>
          <HistoryBackLink fallback="/app/directory">
            {tc("back")}
          </HistoryBackLink>
        </div>
      )}
      <Card className="relative">
        {!view.isSelf && !preview && !myBlock ? (
          <div className="absolute top-2 right-2">
            <MemberMenu targetId={id} name={name} />
          </div>
        ) : null}
        <div
          className={`flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left ${view.isSelf ? "sm:pr-48" : "sm:pr-12"}`}
        >
          <div className="flex shrink-0 flex-col items-center gap-1">
            <Avatar src={photo} name={name} size={96} />
            {!photoShown && p.avatarUrl ? (
              <p className="text-xs text-slate-500">{tv("photoHidden")}</p>
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
            {altName ? <p className="text-slate-600">{altName}</p> : null}
            {p.nameAtAis ? (
              <p className="text-sm text-slate-600">
                {t("nameAtAisValue", { name: p.nameAtAis })}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap justify-center gap-1 sm:justify-start">
              {view.isSelf ? <Badge tone="slate">{t("self")}</Badge> : null}
              {family ? <Badge tone="green">{tf("familyMember")}</Badge> : null}
              {!view.isSelf && followsMe(theirFollow) ? (
                <Badge tone="slate">{tf("followsYou")}</Badge>
              ) : null}
              {p.roles.map((r) => (
                <Badge key={r.role} tone="brand">
                  {tr(roleLabelKey(r))}
                </Badge>
              ))}
            </div>
            <FollowCounts
              followers={counts.followers}
              following={counts.following}
              linked={view.isSelf}
            />
          </div>
        </div>
        {followState || myBlock ? (
          <div className="mt-4 flex flex-wrap items-start justify-center gap-2 sm:justify-start">
            {followState ? (
              <div className="flex flex-col items-center gap-1 sm:items-start">
                <FollowButton targetId={id} state={followState} name={name} />
                {canRequest ? (
                  <p className="text-balance text-sm text-slate-500">
                    {tf("followHint")}
                  </p>
                ) : null}
              </div>
            ) : null}
            {canMessage ? <MessageButton memberId={id} /> : null}
            {myBlock ? (
              <BlockControl targetId={id} name={name} blocked />
            ) : null}
          </div>
        ) : null}
      </Card>

      {p.bio ? (
        <Card>
          <h2 className="mb-2 text-lg font-semibold">{t("sections.about")}</h2>
          <p className="whitespace-pre-line text-slate-800">{p.bio}</p>
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-3 text-lg font-semibold">
          {t("sections.aisRecord")}
        </h2>
        <AisRecord roles={p.roles} />
      </Card>

      {former ? (
        <Card>
          <h2 className="mb-2 text-lg font-semibold">
            {t("sections.currentStage")}
          </h2>
          <p className="text-slate-800">
            {former.currentStage
              ? tr(`stage.${former.currentStage}`)
              : t("stageNotSet")}
          </p>
          {priv?.currentStageDetail ? (
            <p className="mt-1 whitespace-pre-line text-sm text-slate-600">
              {priv.currentStageDetail}
            </p>
          ) : null}
        </Card>
      ) : null}

      {education.length || work.length ? (
        <Card>
          <h2 className="mb-3 text-lg font-semibold">
            {t("sections.history")}
          </h2>
          <HistoryList education={history.education} work={history.work} />
          {hiddenHistory > 0 ? (
            <p
              className={`text-sm text-slate-600 ${history.education.length || history.work.length ? "mt-3" : ""}`}
            >
              {tv("historyHidden", { count: hiddenHistory })}
            </p>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-3 text-lg font-semibold">{t("sections.contact")}</h2>
        {view.access === "followers" && hasContact ? (
          <p className="-mt-2 mb-3 text-sm text-slate-500">
            {t("sharedWithFollowers")}
          </p>
        ) : null}
        {priv ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            {/* Date of birth: only the member themselves and admins. */}
            {showBirthDate ? (
              <div>
                <dt className="text-sm text-slate-500">{tb("title")}</dt>
                <dd>
                  {birthDate ? (
                    formatBirthDate(birthDate, lang)
                  ) : (
                    <span className="text-slate-500">{tb("notSet")}</span>
                  )}
                </dd>
              </div>
            ) : null}
            {priv.email ? (
              <div>
                <dt className="text-sm text-slate-500">{t("fields.email")}</dt>
                <dd className="break-all">
                  <a
                    className="text-brand-700 underline"
                    href={`mailto:${priv.email}`}
                  >
                    {priv.email}
                  </a>
                </dd>
              </div>
            ) : null}
            {priv.phone ? (
              <div>
                <dt className="text-sm text-slate-500">{t("fields.phone")}</dt>
                <dd>
                  <a
                    className="text-brand-700 underline"
                    href={`tel:${priv.phone.replace(/[^0-9+]/g, "")}`}
                  >
                    {priv.phone}
                  </a>
                </dd>
              </div>
            ) : null}
            {priv.lineDisplayName ? (
              <div>
                <dt className="text-sm text-slate-500">
                  {t("fields.lineDisplayName")}
                </dt>
                <dd>{priv.lineDisplayName}</dd>
              </div>
            ) : null}
            {SOCIAL_KEYS.filter((k) => social[k]).map((k) => (
              <div key={k}>
                <dt className="text-sm text-slate-500">{t(`fields.${k}`)}</dt>
                <dd className="break-all">
                  <a
                    className="text-brand-700 underline"
                    href={social[k]}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    {social[k]}
                  </a>
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        {priv &&
        !priv.email &&
        !priv.phone &&
        !priv.lineDisplayName &&
        !Object.keys(social).length ? (
          <p className="text-slate-600">
            {view.access === "followers"
              ? t("noContactFollowers")
              : t("noContact")}
          </p>
        ) : null}
        {priv ? null : (
          <Alert tone="info">
            <p className="font-semibold">{t("locked.title")}</p>
            <p className="mt-1">
              {!view.sharesWithFollowers
                ? t("locked.familyOnly", { name })
                : followState === "requested"
                  ? t("locked.requested")
                  : canRequest || preview
                    ? t("locked.body", { name })
                    : t("locked.unavailable")}
            </p>
          </Alert>
        )}
        <HiddenFields labels={hiddenLabels} />
      </Card>
    </div>
  );
}
