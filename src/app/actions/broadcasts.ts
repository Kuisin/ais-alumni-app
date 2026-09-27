"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { AudienceKey } from "@/generated/prisma/enums";
import {
  type BroadcastPreview,
  getBroadcastRights,
  previewBroadcast,
  sendBroadcast,
} from "@/lib/broadcasts";
import { db } from "@/lib/db";
import { type Audience, rightFor, withinLimit } from "@/lib/permissions";
import { AuthError, actionActive } from "@/lib/session";

export type BroadcastFormState = {
  step: "compose" | "confirm" | "sent";
  /** key in the "broadcast" namespace */
  message?: string;
  fieldErrors?: Partial<
    Record<"title" | "body" | "audience" | "cohortId", string>
  >;
  preview?: BroadcastPreview;
} | null;

const formSchema = z
  .object({
    audience: z.enum(["ALL", "ROLES", "COHORT"]),
    roles: z.array(z.enum(AudienceKey)),
    cohortId: z.string().trim(),
    title: z.string().trim().min(1, "required").max(100, "tooLong"),
    body: z.string().trim().min(1, "required").max(2000, "tooLong"),
  })
  .superRefine((v, ctx) => {
    if (v.audience === "ROLES" && v.roles.length === 0)
      ctx.addIssue({
        code: "custom",
        path: ["audience"],
        message: "rolesRequired",
      });
    if (v.audience === "COHORT" && !v.cohortId)
      ctx.addIssue({
        code: "custom",
        path: ["cohortId"],
        message: "cohortRequired",
      });
  });

function toAudience(v: z.infer<typeof formSchema>): Audience {
  if (v.audience === "COHORT") return { scope: "COHORT", cohortId: v.cohortId };
  return { scope: "ALL", audiences: v.audience === "ROLES" ? v.roles : [] };
}

/**
 * Two-step send: intent=preview shows recipient and LINE counts; intent=send
 * delivers. Permissions and limits are checked on both steps.
 */
export async function broadcastAction(
  _prev: BroadcastFormState,
  fd: FormData,
): Promise<BroadcastFormState> {
  let me: Awaited<ReturnType<typeof actionActive>>;
  try {
    me = await actionActive();
  } catch (e) {
    if (e instanceof AuthError)
      return { step: "compose", message: "errors.forbidden" };
    throw e;
  }
  const intent = fd.get("intent");
  if (intent === "edit") return { step: "compose" };

  const parsed = formSchema.safeParse({
    audience: fd.get("audience"),
    roles: fd.getAll("roles"),
    cohortId: String(fd.get("cohortId") ?? ""),
    title: String(fd.get("title") ?? ""),
    body: String(fd.get("body") ?? ""),
  });
  if (!parsed.success) {
    return {
      step: "compose",
      message: "errors.validation",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((i) => [String(i.path[0]), i.message]),
      ),
    };
  }
  const audience = toAudience(parsed.data);
  const right = rightFor(await getBroadcastRights(me), audience);
  if (!right) return { step: "compose", message: "errors.notAllowed" };

  const recent = await db.broadcast.findMany({
    where: {
      senderId: me.id,
      createdAt: { gte: new Date(Date.now() - 7 * 86400000) },
    },
    select: { createdAt: true },
  });
  if (
    !withinLimit(
      right.position,
      recent.map((r) => r.createdAt),
    )
  ) {
    return { step: "compose", message: "errors.limit" };
  }

  if (intent !== "send") {
    const preview = await previewBroadcast(me.id, audience);
    if (preview.recipients === 0)
      return { step: "compose", message: "errors.noRecipients" };
    return { step: "confirm", preview };
  }
  const result = await sendBroadcast({
    sender: me,
    right,
    audience,
    title: parsed.data.title,
    body: parsed.data.body,
  });
  refresh();
  return { step: "sent", preview: result, message: "sent" };
}
