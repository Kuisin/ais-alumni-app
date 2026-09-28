"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { lineConfigured } from "@/lib/line";
import { syncLineMenus } from "@/lib/line-menu-sync";
import { installRichMenus, richMenuBody } from "@/lib/line-richmenu";
import { richMenuImage, richMenuLabels } from "@/lib/line-richmenu-image";
import { actionAdmin } from "@/lib/session";

export type RichMenuState = {
  ok?: boolean;
  error?: "notConfigured" | "failed";
  detail?: string;
  linked?: number;
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
    const res = await installRichMenus(
      async (locale, badges) => {
        const { labels, chatBar } = await richMenuLabels(locale);
        const image = await (await richMenuImage(locale, badges)).arrayBuffer();
        return { body: richMenuBody(locale, labels, chatBar, badges), image };
      },
      // New menus have new IDs: relink every member's variant.
      async () => (await syncLineMenus({ force: true })).changed,
    );
    await audit(me.id, "line.richmenu.install", undefined, {
      ids: res.ids,
      linked: res.linked,
      removed: res.removed,
    });
    revalidatePath("/[locale]/app/admin/line", "page");
    return { ok: true, linked: res.linked, removed: res.removed };
  } catch (e) {
    console.error("[line-richmenu] install failed", e);
    return {
      error: "failed",
      detail: e instanceof Error ? e.message.slice(0, 300) : undefined,
    };
  }
}
