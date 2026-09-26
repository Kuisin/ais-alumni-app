"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { VerificationStatus, VouchAnswer } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { AuthError, actionActive } from "@/lib/session";

export type VouchAnswerState = {
  ok: boolean;
  message?: "saved" | "forbidden" | "validation" | "closed";
} | null;

const schema = z.object({
  vouchId: z.string().min(1),
  answer: z.enum(VouchAnswer),
});

/** A member answers "Do you know X?" (§6.4.2). Only the asked voucher may answer. */
export async function answerVouchAction(
  _prev: VouchAnswerState,
  formData: FormData,
): Promise<VouchAnswerState> {
  let userId: string;
  try {
    userId = (await actionActive()).id;
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: "forbidden" };
    throw e;
  }
  const parsed = schema.safeParse({
    vouchId: formData.get("vouchId"),
    answer: formData.get("answer"),
  });
  if (!parsed.success) return { ok: false, message: "validation" };

  const vouch = await db.vouch.findUnique({
    where: { id: parsed.data.vouchId },
    select: { voucherId: true, request: { select: { status: true } } },
  });
  if (!vouch || vouch.voucherId !== userId)
    return { ok: false, message: "forbidden" };
  // Answers can be changed until the request is decided.
  if (
    vouch.request.status !== VerificationStatus.PENDING &&
    vouch.request.status !== VerificationStatus.NEEDS_INFO
  ) {
    return { ok: false, message: "closed" };
  }
  await db.vouch.update({
    where: { id: parsed.data.vouchId },
    data: { answer: parsed.data.answer, answeredAt: new Date() },
  });
  revalidatePath("/[locale]/app/vouch/[id]", "page");
  return { ok: true, message: "saved" };
}
