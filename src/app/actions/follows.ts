"use server";

import { refresh } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { FollowStatus } from "@/generated/prisma/enums";
import { redirect } from "@/i18n/navigation";
import {
  acceptFollow,
  blockUser,
  declineFollow,
  removeFollower,
  requestFollow,
  unblockUser,
  unfollow,
} from "@/lib/follows";
import { AuthError, actionActive } from "@/lib/session";

/** Messages are keys in the "follows" namespace. */
export type FollowActionState = { ok: boolean; message: string } | null;

const id = z.string().trim().min(1).max(64);
const TargetSchema = z.object({ targetId: id });
const FollowIdSchema = z.object({ followId: id });
const FollowerSchema = z.object({ followerId: id });

function field(formData: FormData, name: string): string {
  const v = formData.get(name);
  return typeof v === "string" ? v : "";
}

export async function requestFollowAction(
  _prev: FollowActionState,
  formData: FormData,
): Promise<FollowActionState> {
  let me: Awaited<ReturnType<typeof actionActive>>;
  try {
    me = await actionActive();
  } catch (e) {
    if (e instanceof AuthError)
      return { ok: false, message: "errors.inactive" };
    throw e;
  }
  const parsed = TargetSchema.safeParse({
    targetId: field(formData, "targetId"),
  });
  if (!parsed.success) return { ok: false, message: "errors.notFound" };
  const res = await requestFollow(me, parsed.data.targetId);
  if (!res.ok) return { ok: false, message: `errors.${res.reason}` };
  refresh();
  return {
    ok: true,
    message:
      res.status === FollowStatus.ACCEPTED
        ? "status.autoAccepted"
        : "status.requestSent",
  };
}

/** Unfollow or cancel my pending request. */
export async function unfollowAction(formData: FormData): Promise<void> {
  const me = await actionActive();
  const parsed = TargetSchema.safeParse({
    targetId: field(formData, "targetId"),
  });
  if (!parsed.success) return;
  await unfollow(me, parsed.data.targetId);
  refresh();
}

export async function acceptFollowAction(formData: FormData): Promise<void> {
  const me = await actionActive();
  const parsed = FollowIdSchema.safeParse({
    followId: field(formData, "followId"),
  });
  if (!parsed.success) return;
  await acceptFollow(me, parsed.data.followId);
  refresh();
}

export async function declineFollowAction(formData: FormData): Promise<void> {
  const me = await actionActive();
  const parsed = FollowIdSchema.safeParse({
    followId: field(formData, "followId"),
  });
  if (!parsed.success) return;
  await declineFollow(me, parsed.data.followId);
  refresh();
}

export async function removeFollowerAction(formData: FormData): Promise<void> {
  const me = await actionActive();
  const parsed = FollowerSchema.safeParse({
    followerId: field(formData, "followerId"),
  });
  if (!parsed.success) return;
  await removeFollower(me, parsed.data.followerId);
  refresh();
}

/** Block, then leave the (now hidden) profile for the blocked list. */
export async function blockAction(formData: FormData): Promise<void> {
  const me = await actionActive();
  const parsed = TargetSchema.safeParse({
    targetId: field(formData, "targetId"),
  });
  if (!parsed.success) return;
  const ok = await blockUser(me, parsed.data.targetId);
  if (!ok) return;
  const locale = await getLocale();
  redirect({ href: "/follows?tab=blocked", locale });
}

export async function unblockAction(formData: FormData): Promise<void> {
  const me = await actionActive();
  const parsed = TargetSchema.safeParse({
    targetId: field(formData, "targetId"),
  });
  if (!parsed.success) return;
  await unblockUser(me, parsed.data.targetId);
  refresh();
}
