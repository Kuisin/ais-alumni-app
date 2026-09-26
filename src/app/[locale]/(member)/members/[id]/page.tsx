import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { BlockControl } from "@/components/follows/block-control";
import {
  FollowButton,
  type FollowUiState,
} from "@/components/follows/follow-button";
import { avatarSrc } from "@/components/profile/avatar-src";
import { AisRecord } from "@/components/profile/role-details";
import {
  parseSocialLinks,
  SOCIAL_KEYS,
} from "@/components/profile/social-links";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { Alert, Badge, Card } from "@/components/ui/card";
import { FollowStatus, type Locale, RoleKey } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import {
  canRequestFollow,
  getProfileForViewer,
  sameFamily,
  toViewer,
} from "@/lib/authz";
import { db } from "@/lib/db";
import { displayName } from "@/lib/format";
import { requireActive } from "@/lib/session";

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile");
  return { title: t("title") };
}

export default async function MemberProfilePage({ params }: Props) {
  const { id } = await params;
  const me = await requireActive();
  const view = await getProfileForViewer(me, id);
  if (!view) notFound();

  const t = await getTranslations("profile");
  const tf = await getTranslations("follows");
  const tr = await getTranslations("roles");
  const locale = (await getLocale()) as Locale;
  const p = view.public;
  const name = displayName(p, locale);
  const altName = locale === "ja" && p.nameKanji ? p.nameRomaji : p.nameKanji;

  // Non-private columns needed to decide which relationship controls to show.
  const [targetMeta, myBlock] = view.isSelf
    ? [null, null]
    : await Promise.all([
        db.user.findUnique({
          where: { id },
          select: {
            id: true,
            state: true,
            familyId: true,
            dateOfBirth: true,
            roles: { select: { role: true } },
          },
        }),
        db.block.findUnique({
          where: { blockerId_blockedId: { blockerId: me.id, blockedId: id } },
          select: { id: true },
        }),
      ]);
  if (!view.isSelf && !targetMeta) notFound();

  const family = targetMeta ? sameFamily(me, targetMeta) : false;
  let followState: FollowUiState | null = null;
  if (targetMeta && !family && !myBlock) {
    const rel = view.relationship;
    if (rel.follow === FollowStatus.ACCEPTED) followState = "following";
    else if (rel.follow === FollowStatus.REQUESTED) followState = "requested";
    else {
      const check = canRequestFollow(
        toViewer(me),
        { ...targetMeta, roles: targetMeta.roles.map((r) => r.role) },
        rel,
      );
      if (check.ok) followState = "none";
    }
  }

  const former = p.roles.find((r) => r.role === RoleKey.FORMER_STUDENT);
  const priv = view.private;
  const social = priv ? parseSocialLinks(priv.socialLinks) : {};

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
          <Avatar src={avatarSrc(p.avatarUrl)} name={name} size={96} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
            {altName && altName !== name ? (
              <p className="text-slate-600">{altName}</p>
            ) : null}
            {p.nameAtAis ? (
              <p className="text-sm text-slate-600">
                {t("nameAtAisValue", { name: p.nameAtAis })}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap justify-center gap-1 sm:justify-start">
              {view.isSelf ? <Badge tone="slate">{t("self")}</Badge> : null}
              {family ? <Badge tone="green">{tf("familyMember")}</Badge> : null}
              {p.roles.map((r) => (
                <Badge key={r.role} tone="brand">
                  {tr(`role.${r.role}`)}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-start justify-center gap-2 sm:justify-start">
          {view.isSelf ? (
            <Link href="/profile/edit" className={buttonClass("primary")}>
              {t("editProfile")}
            </Link>
          ) : null}
          {followState ? (
            <FollowButton targetId={id} state={followState} />
          ) : null}
          {!view.isSelf ? (
            <BlockControl
              targetId={id}
              name={name}
              blocked={Boolean(myBlock)}
            />
          ) : null}
        </div>
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

      <Card>
        <h2 className="mb-3 text-lg font-semibold">{t("sections.contact")}</h2>
        {priv ? (
          <dl className="grid gap-3 sm:grid-cols-2">
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
            {!priv.email &&
            !priv.phone &&
            !priv.lineDisplayName &&
            !Object.keys(social).length ? (
              <p className="text-slate-600">{t("noContact")}</p>
            ) : null}
          </dl>
        ) : (
          <Alert tone="info">
            <p className="font-semibold">{t("locked.title")}</p>
            <p className="mt-1">
              {followState === "requested"
                ? t("locked.requested")
                : followState === "none"
                  ? t("locked.body", { name })
                  : t("locked.unavailable")}
            </p>
          </Alert>
        )}
      </Card>
    </div>
  );
}
