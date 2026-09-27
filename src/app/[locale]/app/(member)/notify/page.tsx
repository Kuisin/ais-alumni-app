import { redirect } from "@/i18n/navigation";

/** Moved to admin mode. */
export default async function OldNotifyPage({
  params,
}: PageProps<"/[locale]/app/notify">) {
  const { locale } = await params;
  redirect({ href: "/app/admin/notify", locale });
}
