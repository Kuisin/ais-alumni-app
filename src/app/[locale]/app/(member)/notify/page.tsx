import { redirect } from "@/i18n/navigation";

/** Moved to admin mode. */
export default async function OldNotifyPage({
  params,
}: PageProps<"/[locale]/app/notify">) {
  const { locale } = await params;
  // Messages are switched off for now (src/lib/features.ts): go to ニュース.
  redirect({ href: "/app/news", locale });
}
