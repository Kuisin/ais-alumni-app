"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { parseCohortNumber } from "@/lib/cohorts";
import { ensureCohort } from "@/lib/cohorts-db";
import { db } from "@/lib/db";
import {
  confirmFamilyLink,
  createFamilyLink,
  removePendingFamilyLink,
} from "@/lib/family";
import { settleParentFromChildren } from "@/lib/parent-onboarding";
import { AuthError, actionActive } from "@/lib/session";
import { syncMemberStatus } from "@/lib/status-sync";
import { notifyParentOutcomes } from "@/lib/verification/decision-notify";

/** Messages are keys in the "family" namespace. */
export type FamilyActionState = { ok: boolean; message: string } | null;

const id = z.string().trim().min(1).max(64);
const ClaimSchema = z.object({
  direction: z.enum(["child", "parent"]),
  otherId: id,
});
const ChildNameSchema = z.object({
  childName: z.string().trim().min(1).max(100),
  cohortNumber: z.string().transform((v, ctx) => {
    const n = parseCohortNumber(v);
    if (n == null) {
      ctx.addIssue({ code: "custom", message: "cohort" });
      return z.NEVER;
    }
    return n;
  }),
  leftYear: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}$/.test(v))
    .transform((v) => (v ? Number(v) : null)),
});
const LinkSchema = z.object({ linkId: id });

function field(formData: FormData, name: string): string {
  const v = formData.get(name);
  return typeof v === "string" ? v : "";
}

async function member() {
  try {
    return await actionActive();
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}

/** "This is my child" / "This is my parent" on a search result. */
export async function claimFamilyAction(
  _prev: FamilyActionState,
  formData: FormData,
): Promise<FamilyActionState> {
  const me = await member();
  if (!me) return { ok: false, message: "errors.notAllowed" };
  const parsed = ClaimSchema.safeParse({
    direction: field(formData, "direction"),
    otherId: field(formData, "otherId"),
  });
  if (!parsed.success) return { ok: false, message: "errors.invalid" };
  const res = await createFamilyLink(me, parsed.data);
  if (!res.ok) return { ok: false, message: `errors.${res.error}` };
  refresh();
  return { ok: true, message: "sent" };
}

/** Parent adds a child who has no account; an admin confirms it (§8). */
export async function claimChildByNameAction(
  _prev: FamilyActionState,
  formData: FormData,
): Promise<FamilyActionState> {
  const me = await member();
  if (!me) return { ok: false, message: "errors.notAllowed" };
  const parsed = ChildNameSchema.safeParse({
    childName: field(formData, "childName"),
    cohortNumber: field(formData, "cohortNumber"),
    leftYear: field(formData, "leftYear"),
  });
  if (!parsed.success) return { ok: false, message: "errors.invalid" };
  const res = await createFamilyLink(me, {
    direction: "child",
    childName: parsed.data.childName,
    childCohortId: await ensureCohort(parsed.data.cohortNumber),
    childLeftYear: parsed.data.leftYear,
  });
  if (!res.ok) return { ok: false, message: `errors.${res.error}` };
  // Parent status (current / former) follows the child's class.
  await syncMemberStatus(me.id);
  refresh();
  return { ok: true, message: "sentAdmin" };
}

export async function confirmFamilyLinkAction(
  formData: FormData,
): Promise<void> {
  const me = await actionActive();
  const parsed = LinkSchema.safeParse({ linkId: field(formData, "linkId") });
  if (!parsed.success) return;
  if (await confirmFamilyLink(me, parsed.data.linkId)) {
    // A parent waiting on this child may now get access.
    const link = await db.familyLink.findUnique({
      where: { id: parsed.data.linkId },
      select: { parentId: true },
    });
    const outcome = link
      ? await db.$transaction((tx) =>
          settleParentFromChildren(tx, link.parentId),
        )
      : null;
    if (outcome) await notifyParentOutcomes([outcome]);
  }
  refresh();
}

/** Decline a request addressed to me, or cancel one I sent (pending only). */
export async function removeFamilyLinkAction(
  formData: FormData,
): Promise<void> {
  const me = await actionActive();
  const parsed = LinkSchema.safeParse({ linkId: field(formData, "linkId") });
  if (!parsed.success) return;
  await removePendingFamilyLink(me, parsed.data.linkId);
  refresh();
}
