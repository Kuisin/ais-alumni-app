import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import "../globals.css";

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });
  return {
    title: { default: t("appName"), template: `%s | ${t("appName")}` },
    description: t("tagline"),
    manifest: "/manifest.webmanifest",
    // Opaque white status bar, like the header.
    appleWebApp: {
      capable: true,
      title: t("appNameShort"),
      statusBarStyle: "default",
    },
    icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
  };
}

export const viewport: Viewport = {
  // Browser / system bars match the white header and bottom bar (admin
  // mode overrides it with its dark header).
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  // Draw under the notch / home indicator; the header, bottom bar, footer
  // and chat composer pad themselves with env(safe-area-inset-*).
  viewportFit: "cover",
  // The on-screen keyboard resizes the page (Android), so fixed screens
  // like a chat keep their header and composer in view.
  interactiveWidget: "resizes-content",
};

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "common" });

  return (
    <html lang={locale} className="h-full">
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
