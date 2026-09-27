"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { lineConfigured } from "@/lib/line";
import { installRichMenus, richMenuBody } from "@/lib/line-richmenu";
import { richMenuImage, richMenuLabels } from "@/lib/line-richmenu-image";
import { actionAdmin } from "@/lib/session";

export type RichMenuState = {
  ok?: boolean;
  error?: "notConfigured" | "failed";
  detail?: string;
  linkedEn?: number;
  removed?: number;
};

/** Admin: build the menu images and install them on the Official Account. */
export async function installRichMenuAction(
  _prev: RichMenuState,
  _fd: FormData,
): Promise<RichMenuState> {
  const me = await actionAdmin();
  if (!lineConfigured()) return { error: "notConfigured" };
  try {
    const res = await installRichMenus(async (locale) => {
      const { labels, chatBar } = await richMenuLabels(locale);
      const image = await (await richMenuImage(locale)).arrayBuffer();
      return { body: richMenuBody(locale, labels, chatBar), image };
    });
    await audit(me.id, "line.richmenu.install", undefined, {
      ids: res.ids,
      linkedEn: res.linkedEn,
      removed: res.removed,
    });
    revalidatePath("/[locale]/app/admin/line", "page");
    return { ok: true, linkedEn: res.linkedEn, removed: res.removed };
  } catch (e) {
    console.error("[line-richmenu] install failed", e);
    return {
      error: "failed",
      detail: e instanceof Error ? e.message.slice(0, 300) : undefined,
    };
  }
}
