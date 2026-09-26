"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { actionActive } from "@/lib/session";

/** Hide the dashboard "Get updates on LINE" banner for 30 days (§5.2). */
export async function dismissLineBannerAction(): Promise<void> {
  const user = await actionActive();
  await db.user.update({
    where: { id: user.id },
    data: { lineBannerDismissedAt: new Date() },
  });
  revalidatePath("/[locale]/dashboard", "page");
}
