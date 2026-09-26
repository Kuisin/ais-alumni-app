"use server";

import { signOut } from "@/auth";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

/** Persist the UI language for signed-in users (§12). */
export async function setLocaleAction(locale: "ja" | "en"): Promise<void> {
  if (locale !== "ja" && locale !== "en") return;
  const user = await getCurrentUser();
  if (user && user.locale !== locale) {
    await db.user.update({ where: { id: user.id }, data: { locale } });
  }
}
