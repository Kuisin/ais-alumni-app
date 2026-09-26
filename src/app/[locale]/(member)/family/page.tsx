import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import {
  confirmFamilyLinkAction,
  removeFamilyLinkAction,
} from "@/app/actions/family";
import { MemberCard } from "@/components/directory/member-card";
import { ChildNameForm } from "@/components/family/child-name-form";
import { FamilySearch } from "@/components/family/family-search";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { FamilyLinkInitiator, type Locale } from "@/generated/prisma/enums";
import {
  canClaim,
  canConfirm,
  confirmerFor,
  type FamilyLinkView,
  loadFamily,
  searchFamilyCandidates,
} from "@/lib/family";
import { displayName } from "@/lib/format";
import { requireActive } from "@/lib/session";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("family");
  return { title: t("title") };
}

function param(sp: Record<string, string | string[] | undefined>, key: string) {
  const v = sp[key];
  return ((Array.isArray(v) ? v[0] : v) ?? "").trim().slice(0, 100);
}

/** Families and parent/child links (§8, screen 13). */
export default async function FamilyPage({ searchParams }: Props) {
  const me = await requireActive();
  const t = await getTranslations("family");
  const locale = (await getLocale()) as Locale;
  const sp = await searchParams;
  const childQ = param(sp, "childQ");
  const parentQ = param(sp, "parentQ");
  const roles = me.roles.map((r) => r.role);
  const mayClaimChild = canClaim(roles, "child");
  const mayClaimParent = canClaim(roles, "parent");

  const [{ members, links }, childResults, parentResults] = await Promise.all([
    loadFamily(me),
    mayClaimChild && childQ
      ? searchFamilyCandidates(me, childQ, "child")
      : null,
    mayClaimParent && parentQ
      ? searchFamilyCandidates(me, parentQ, "parent")
      : null,
  ]);

  const toConfirm = links.filter((l) => canConfirm(me.id, l));
  const others = links.filter((l) => !canConfirm(me.id, l));

  const nameOf = (
    u: { nameRomaji: string | null; nameKanji: string | null } | null,
    fallback: string | null,
  ) => (u ? displayName(u, locale) : (fallback ?? "—"));

  function status(l: FamilyLinkView) {
    if (l.confirmedAt)
      return <Badge tone="green">{t("status.confirmed")}</Badge>;
    const who = confirmerFor(l);
    if (who === "admin")
      return <Badge tone="amber">{t("status.pendingAdmin")}</Badge>;
    const other = who === "parent" ? l.parent : l.child;
    return (
      <Badge tone="amber">
        {t("status.pendingOther", { name: nameOf(other, l.childName) })}
      </Badge>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      {toConfirm.length ? (
        <Card>
          <h2 className="mb-3 text-lg font-semibold">
            {t("pendingForMe.title")}
          </h2>
          <ul className="space-y-3">
            {toConfirm.map((l) => {
              // I'm the confirmer, so the initiator is the other side.
              const initiator =
                l.initiatedBy === FamilyLinkInitiator.PARENT
                  ? l.parent
                  : l.child;
              const key =
                l.initiatedBy === FamilyLinkInitiator.PARENT
                  ? "asChild"
                  : "asParent";
              return (
                <li key={l.id}>
                  {initiator ? (
                    <MemberCard
                      member={initiator}
                      meta={t(`pendingForMe.${key}`, {
                        name: nameOf(initiator, null),
                      })}
                      actions={
                        <>
                          <form action={confirmFamilyLinkAction}>
                            <input type="hidden" name="linkId" value={l.id} />
                            <SubmitButton>{t("confirm")}</SubmitButton>
                          </form>
                          <form action={removeFamilyLinkAction}>
                            <input type="hidden" name="linkId" value={l.id} />
                            <SubmitButton variant="secondary">
                              {t("decline")}
                            </SubmitButton>
                          </form>
                        </>
                      }
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-1 text-lg font-semibold">{t("members.title")}</h2>
        <p className="mb-3 text-sm text-slate-600">{t("members.privacy")}</p>
        {members.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {members.map((m) => (
              <li key={m.id}>
                <MemberCard member={m} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>{t("members.empty")}</EmptyState>
        )}
      </Card>

      {others.length ? (
        <Card>
          <h2 className="mb-3 text-lg font-semibold">{t("links.title")}</h2>
          <ul className="divide-y divide-slate-100">
            {others.map((l) => {
              const mine = l.parentId === me.id || l.childId === me.id;
              return (
                <li
                  key={l.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div className="min-w-0">
                    <p>
                      {t("links.row", {
                        parent: nameOf(l.parent, null),
                        child: nameOf(l.child, l.childName),
                      })}
                    </p>
                    <div className="mt-1">{status(l)}</div>
                  </div>
                  {!l.confirmedAt && mine ? (
                    <form action={removeFamilyLinkAction}>
                      <input type="hidden" name="linkId" value={l.id} />
                      <SubmitButton variant="ghost">{t("cancel")}</SubmitButton>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      {mayClaimChild ? (
        <Card>
          <h2 className="mb-1 text-lg font-semibold">
            {t("claimChild.title")}
          </h2>
          <p className="mb-4 text-sm text-slate-600">
            {t("claimChild.description")}
          </p>
          <FamilySearch
            direction="child"
            param="childQ"
            q={childQ}
            results={childResults}
            otherParams={parentQ ? { parentQ } : {}}
          />
          <div className="mt-6 border-t border-slate-100 pt-4">
            <h3 className="mb-3 font-semibold">
              {t("claimChild.manualTitle")}
            </h3>
            <ChildNameForm />
          </div>
        </Card>
      ) : null}

      {mayClaimParent ? (
        <Card>
          <h2 className="mb-1 text-lg font-semibold">
            {t("claimParent.title")}
          </h2>
          <p className="mb-4 text-sm text-slate-600">
            {t("claimParent.description")}
          </p>
          <FamilySearch
            direction="parent"
            param="parentQ"
            q={parentQ}
            results={parentResults}
            otherParams={childQ ? { childQ } : {}}
          />
        </Card>
      ) : null}
    </div>
  );
}
