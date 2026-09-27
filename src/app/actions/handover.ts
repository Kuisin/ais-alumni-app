"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import {
  type ClaimResult,
  cancelHandover,
  claimHandover,
  startHandover,
} from "@/lib/handover";
import { AuthError, actionActive } from "@/lib/session";

export type HandoverFormState = {
  ok: boolean;
  /** key in the "family" namespace */
  message: string;
} | null;

/** Parent: email a handover link to the child. */
export async function startHandoverAction(
  _prev: HandoverFormState,
  fd: FormData,
): Promise<HandoverFormState> {
  let me: Awaited<ReturnType<typeof actionActive>>;
  try {
    me = await actionActive();
  } catch (e) {
    if (e instanceof AuthError)
      return { ok: false, message: "handover.errors.forbidden" };
    throw e;
  }
  const childId = z.string().min(1).max(64).safeParse(fd.get("childId"));
  if (!childId.success)
    return { ok: false, message: "handover.errors.notFound" };
  const r = await startHandover(
    me,
    childId.data,
    String(fd.get("email") ?? ""),
  );
  if (!r.ok) return { ok: false, message: `handover.errors.${r.error}` };
  refresh();
  return { ok: true, message: "handover.sent" };
}

export async function cancelHandoverAction(fd: FormData): Promise<void> {
  const me = await actionActive();
  const childId = z.string().min(1).max(64).parse(fd.get("childId"));
  await cancelHandover(me, childId);
  refresh();
}

/** Child: confirm the handover from the emailed link (no sign-in needed). */
export async function claimHandoverAction(
  _prev: ClaimResult | null,
  fd: FormData,
): Promise<ClaimResult> {
  return claimHandover(String(fd.get("token") ?? ""));
}
