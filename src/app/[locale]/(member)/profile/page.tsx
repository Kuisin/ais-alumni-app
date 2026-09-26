import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireActive } from "@/lib/session";

/** /profile → my public profile page. */
export default async function MyProfilePage() {
  const me = await requireActive();
  redirect({ href: `/members/${me.id}`, locale: await getLocale() });
}
