import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HandoverClaim } from "@/components/family/handover-claim";
import { AppShell } from "@/components/layout/app-shell";
import { Alert, Card } from "@/components/ui/card";
import { displayName } from "@/lib/format";
import { findHandover } from "@/lib/handover";
import { getCurrentUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("family.handover");
  return { title: t("claim.title") };
}

/**
 * Emailed link for a child taking over the account a parent created.
 * Confirming is a button (POST), so link previews can't use the link up.
 */
export default async function HandoverPage({
  params,
}: PageProps<"/[locale]/app/handover/[token]">) {
  const { token, locale: raw } = await params;
  const locale = raw === "en" ? "en" : "ja";
  const t = await getTranslations("family.handover");
  const [h, user] = await Promise.all([findHandover(token), getCurrentUser()]);

  return (
    <AppShell user={null} variant="onboarding">
      <div className="mx-auto max-w-lg">
        <Card className="space-y-4">
          <h1 className="text-xl font-bold">{t("claim.title")}</h1>
          {h ? (
            <>
              <p className="text-slate-700">
                {t("claim.body", {
                  parent: displayName(h.parent, locale),
                  child: displayName(h.child, locale),
                  email: h.email,
                })}
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
                <li>{t("claim.point1")}</li>
                <li>{t("claim.point2")}</li>
                <li>{t("claim.point3")}</li>
              </ul>
              {user ? <Alert tone="info">{t("claim.signedIn")}</Alert> : null}
              <HandoverClaim token={token} signedIn={Boolean(user)} />
            </>
          ) : (
            <Alert tone="error">{t("claim.invalid")}</Alert>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
