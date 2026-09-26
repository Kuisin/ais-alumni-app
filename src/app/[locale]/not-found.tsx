import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

/** Rendered for notFound() inside /[locale]. "/" forwards signed-in users home. */
export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <AppShell user={null} variant="onboarding">
      <div className="mx-auto max-w-xl">
        <Card className="space-y-4 text-center">
          <p className="text-4xl font-bold text-brand-700" aria-hidden="true">
            404
          </p>
          <h1 className="text-2xl font-bold">{t("notFoundTitle")}</h1>
          <Link href="/" className={buttonClass("primary")}>
            {t("goHome")}
          </Link>
        </Card>
      </div>
    </AppShell>
  );
}
