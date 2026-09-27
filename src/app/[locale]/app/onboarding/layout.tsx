import { getLocale, getTranslations } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
import { SupportDialog } from "@/components/support/support-dialog";
import { requireUser } from "@/lib/session";

export default async function OnboardingLayout({
  children,
}: LayoutProps<"/[locale]/app/onboarding">) {
  const user = await requireUser();
  const [t, locale] = await Promise.all([
    getTranslations("support"),
    getLocale(),
  ]);
  // Questions or errors while signing up: the support form in a dialog.
  const defaults = {
    name:
      (locale === "ja"
        ? (user.nameKanji ?? user.nameRomaji)
        : (user.nameRomaji ?? user.nameKanji)) ?? "",
    email: user.primaryEmail ?? "",
    type: "QUESTION",
    topic: "REGISTRATION",
  };
  return (
    <AppShell
      user={user}
      variant="onboarding"
      help={<SupportDialog compact defaults={defaults} />}
    >
      <div className="mx-auto max-w-xl">
        {children}
        <aside className="mt-10 flex flex-col items-center gap-2 border-t border-slate-200 pt-6 text-center">
          <p className="text-sm text-slate-600">{t("dialog.help")}</p>
          <SupportDialog defaults={defaults} />
        </aside>
      </div>
    </AppShell>
  );
}
