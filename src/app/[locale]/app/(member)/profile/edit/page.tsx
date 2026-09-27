import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

/** Editing now happens on the profile itself (each section's 編集). */
export default async function ProfileEditPage() {
  redirect({ href: "/app/profile", locale: await getLocale() });
}
