"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { z } from "zod";
import {
  AVATAR_MAX_BYTES,
  detectAvatarType,
} from "@/components/profile/image-type";
import {
  isHttpUrl,
  SOCIAL_KEYS,
  SOCIAL_URL_MAX,
  type SocialLinks,
} from "@/components/profile/social-links";
import type { Prisma } from "@/generated/prisma/client";
import { LifeStage, RoleKey } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { AuthError, actionActive, type CurrentUser } from "@/lib/session";
import { deletePrivate, putPrivate } from "@/lib/storage";

/**
 * Own-profile edits (§10.2). AIS record fields (roles, years, division) are
 * admin-editable only and are never accepted here.
 * `message` is a key in the "profile" namespace; `fields` lists invalid inputs.
 */
export type ProfileActionState = {
  ok: boolean;
  message: string;
  fields?: string[];
} | null;

function field(formData: FormData, name: string): string {
  const v = formData.get(name);
  return typeof v === "string" ? v : "";
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v));

const socialUrl = z
  .string()
  .trim()
  .max(SOCIAL_URL_MAX)
  .refine((v) => v === "" || isHttpUrl(v));

// Names are fixed after approval: they change through a name request
// (src/app/actions/name-requests.ts), never here.
const ProfileSchema = z.object({
  bio: optionalText(1000),
  phone: optionalText(40).refine((v) => v === null || /^[0-9+\-() ]+$/.test(v)),
  autoAcceptSameYear: z.boolean(),
  instagram: socialUrl,
  linkedin: socialUrl,
  facebook: socialUrl,
  x: socialUrl,
  website: socialUrl,
});

const StageSchema = z.object({
  currentStage: z.enum(LifeStage),
  currentStageDetail: optionalText(200),
});

async function member(): Promise<CurrentUser | null> {
  try {
    return await actionActive();
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}

const FORBIDDEN = { ok: false, message: "errors.forbidden" } as const;

export async function updateProfileAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const me = await member();
  if (!me) return FORBIDDEN;
  const parsed = ProfileSchema.safeParse({
    bio: field(formData, "bio"),
    phone: field(formData, "phone"),
    autoAcceptSameYear: formData.get("autoAcceptSameYear") === "on",
    ...Object.fromEntries(SOCIAL_KEYS.map((k) => [k, field(formData, k)])),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: "errors.validation",
      fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))],
    };
  }
  const d = parsed.data;
  const socialLinks: SocialLinks = {};
  for (const k of SOCIAL_KEYS) if (d[k]) socialLinks[k] = d[k];
  await db.user.update({
    where: { id: me.id },
    data: {
      bio: d.bio,
      phone: d.phone,
      autoAcceptSameYear: d.autoAcceptSameYear,
      socialLinks: socialLinks as Prisma.InputJsonValue,
    },
  });
  refresh();
  return { ok: true, message: "saved" };
}

/** Keys we created for this user; Google avatar URLs are never deleted. */
function ownedAvatarKey(userId: string, value: string | null): string | null {
  return value?.startsWith(`avatars/${userId}/`) ? value : null;
}

async function deleteOldAvatar(userId: string, value: string | null) {
  const key = ownedAvatarKey(userId, value);
  if (!key) return;
  try {
    await deletePrivate(key);
  } catch (e) {
    console.error("[profile] failed to delete old avatar", e);
  }
}

export async function uploadAvatarAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const me = await member();
  if (!me) return FORBIDDEN;
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, message: "errors.fileMissing", fields: ["avatar"] };
  if (file.size > AVATAR_MAX_BYTES)
    return { ok: false, message: "errors.fileSize", fields: ["avatar"] };
  const buf = Buffer.from(await file.arrayBuffer());
  const type = detectAvatarType(buf);
  if (!type)
    return { ok: false, message: "errors.fileType", fields: ["avatar"] };

  const stored = await putPrivate(
    `avatars/${me.id}/${randomUUID()}.${type.ext}`,
    buf,
    type.mime,
  );
  await db.user.update({ where: { id: me.id }, data: { avatarUrl: stored } });
  await deleteOldAvatar(me.id, me.avatarUrl);
  refresh();
  return { ok: true, message: "photoUploaded" };
}

export async function removeAvatarAction(): Promise<void> {
  const me = await actionActive();
  await db.user.update({ where: { id: me.id }, data: { avatarUrl: null } });
  await deleteOldAvatar(me.id, me.avatarUrl);
  refresh();
}

function isFormerStudent(me: CurrentUser): boolean {
  return me.roles.some((r) => r.role === RoleKey.FORMER_STUDENT);
}

/** Current stage + private detail (§7). Bumps currentStageUpdatedAt. */
export async function updateStageAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const me = await member();
  if (!me || !isFormerStudent(me)) return FORBIDDEN;
  const parsed = StageSchema.safeParse({
    currentStage: field(formData, "currentStage"),
    currentStageDetail: field(formData, "currentStageDetail"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: "errors.validation",
      fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))],
    };
  }
  await db.userRole.update({
    where: { userId_role: { userId: me.id, role: RoleKey.FORMER_STUDENT } },
    data: { ...parsed.data, currentStageUpdatedAt: new Date() },
  });
  refresh();
  return { ok: true, message: "stageSaved" };
}

/** "My status is still current" — only bumps currentStageUpdatedAt (§7). */
export async function confirmStageAction(
  _prev: ProfileActionState,
): Promise<ProfileActionState> {
  const me = await member();
  if (!me || !isFormerStudent(me)) return FORBIDDEN;
  await db.userRole.update({
    where: { userId_role: { userId: me.id, role: RoleKey.FORMER_STUDENT } },
    data: { currentStageUpdatedAt: new Date() },
  });
  refresh();
  return { ok: true, message: "stageConfirmed" };
}
