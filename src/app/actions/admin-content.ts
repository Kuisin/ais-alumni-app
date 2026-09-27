"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { AudienceKey } from "@/generated/prisma/enums";
import { redirect } from "@/i18n/navigation";
import { rolesForAudiences } from "@/lib/audience";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { parseJstLocal } from "@/lib/format";
import { COVER_MAX_BYTES, sendNewsNotification } from "@/lib/news";
import { actionAdmin } from "@/lib/session";
import { deletePrivate, putPrivate } from "@/lib/storage";

/**
 * Admin editors for events and news (§10.3, §10.4). Every action re-checks
 * admin rights with actionAdmin() and every mutation is audited.
 */

export type AdminFormState = {
  ok?: boolean;
  /** key in adminContent.errors */
  error?: string;
  /** field name → key in adminContent.errors */
  fieldErrors?: Record<string, string>;
};

const ERROR_KEYS = new Set([
  "required",
  "tooLong",
  "invalid",
  "invalidDate",
  "invalidUrl",
  "invalidCapacity",
  "titleRequired",
  "endBeforeStart",
  "deadlineAfterStart",
  "coverType",
  "coverSize",
]);

function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= ERROR_KEYS.has(issue.message) ? issue.message : "invalid";
  }
  return out;
}

function str(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

async function adminOrNull() {
  try {
    return await actionAdmin();
  } catch {
    return null;
  }
}

async function go(href: string): Promise<never> {
  return redirect({ href, locale: await getLocale() });
}

const DATETIME_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;
const validDate = (v: string) =>
  DATETIME_LOCAL.test(v) && !Number.isNaN(parseJstLocal(v).getTime());

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "tooLong")
    .transform((v) => v || null);

/** datetime-local, interpreted as JST; empty → null. */
const optDate = z
  .string()
  .trim()
  .refine((v) => !v || validDate(v), "invalidDate")
  .transform((v) => (v ? parseJstLocal(v) : null));

const reqDate = z
  .string()
  .trim()
  .min(1, "required")
  .refine(validDate, "invalidDate")
  .transform(parseJstLocal);

const targetAudiences = z.array(z.enum(AudienceKey, "invalid"));

const Id = z.string().min(1).max(64);

// ─── Events ───────────────────────────────────────────────────────────────

const EventSchema = z
  .object({
    titleJa: optText(200),
    titleEn: optText(200),
    bodyJa: optText(20000),
    bodyEn: optText(20000),
    startsAt: reqDate,
    endsAt: optDate,
    rsvpDeadline: optDate,
    location: optText(300),
    mapUrl: z
      .string()
      .trim()
      .max(2000, "tooLong")
      .refine((v) => !v || /^https?:\/\/\S+$/i.test(v), "invalidUrl")
      .transform((v) => v || null),
    capacity: z
      .string()
      .trim()
      .refine(
        (v) => !v || (/^\d{1,6}$/.test(v) && Number(v) >= 1),
        "invalidCapacity",
      )
      .transform((v) => (v ? Number(v) : null)),
    targetAudiences,
  })
  .superRefine((d, ctx) => {
    if (!d.titleJa && !d.titleEn) {
      ctx.addIssue({
        code: "custom",
        path: ["titleJa"],
        message: "titleRequired",
      });
    }
    if (d.endsAt && d.endsAt < d.startsAt) {
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "endBeforeStart",
      });
    }
    if (d.rsvpDeadline && d.rsvpDeadline > d.startsAt) {
      ctx.addIssue({
        code: "custom",
        path: ["rsvpDeadline"],
        message: "deadlineAfterStart",
      });
    }
  });

function revalidateEvents() {
  revalidatePath("/[locale]/app/admin/events", "layout");
  revalidatePath("/[locale]/app/events", "layout");
  revalidatePath("/[locale]/app/dashboard", "page");
}

/** Create (no id) or update an event. */
export async function saveEventAction(
  _prev: AdminFormState,
  fd: FormData,
): Promise<AdminFormState> {
  const admin = await adminOrNull();
  if (!admin) return { error: "forbidden" };

  const id = str(fd, "id") || null;
  const parsed = EventSchema.safeParse({
    titleJa: str(fd, "titleJa"),
    titleEn: str(fd, "titleEn"),
    bodyJa: str(fd, "bodyJa"),
    bodyEn: str(fd, "bodyEn"),
    startsAt: str(fd, "startsAt"),
    endsAt: str(fd, "endsAt"),
    rsvpDeadline: str(fd, "rsvpDeadline"),
    location: str(fd, "location"),
    mapUrl: str(fd, "mapUrl"),
    capacity: str(fd, "capacity"),
    targetAudiences: fd.getAll("targetAudiences"),
  });
  if (!parsed.success)
    return { error: "validation", fieldErrors: toFieldErrors(parsed.error) };
  // Keep the legacy role column filled for older code (src/lib/audience.ts).
  const data = {
    ...parsed.data,
    targetRoles: rolesForAudiences(parsed.data.targetAudiences),
  };
  const summary = {
    title: data.titleJa ?? data.titleEn,
    startsAt: data.startsAt.toISOString(),
    capacity: data.capacity,
    targetAudiences: data.targetAudiences,
  };

  if (id) {
    if (!Id.safeParse(id).success) return { error: "notFound" };
    const updated = await db.event.updateMany({ where: { id }, data });
    if (updated.count === 0) return { error: "notFound" };
    await audit(admin.id, "event.update", { type: "Event", id }, summary);
    revalidateEvents();
    return { ok: true };
  }

  const event = await db.event.create({
    data: { ...data, createdById: admin.id },
  });
  await audit(
    admin.id,
    "event.create",
    { type: "Event", id: event.id },
    summary,
  );
  revalidateEvents();
  return go(`/app/admin/events/${event.id}?created=1`);
}

export async function deleteEventAction(fd: FormData): Promise<void> {
  const admin = await actionAdmin();
  const id = Id.parse(str(fd, "id"));
  const event = await db.event.findUnique({
    where: { id },
    select: {
      titleJa: true,
      titleEn: true,
      startsAt: true,
      _count: { select: { rsvps: true } },
    },
  });
  if (event) {
    // RSVPs cascade.
    await db.event.delete({ where: { id } });
    await audit(
      admin.id,
      "event.delete",
      { type: "Event", id },
      {
        title: event.titleJa ?? event.titleEn,
        startsAt: event.startsAt.toISOString(),
        rsvps: event._count.rsvps,
      },
    );
    revalidateEvents();
  }
  return go("/app/admin/events?deleted=1");
}

// ─── News ─────────────────────────────────────────────────────────────────

const NewsSchema = z
  .object({
    titleJa: optText(200),
    titleEn: optText(200),
    bodyJa: optText(50000),
    bodyEn: optText(50000),
    publishedAt: optDate,
    pinned: z.boolean(),
    targetAudiences,
  })
  .superRefine((d, ctx) => {
    if (!d.titleJa && !d.titleEn) {
      ctx.addIssue({
        code: "custom",
        path: ["titleJa"],
        message: "titleRequired",
      });
    }
  });

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Identify JPG/PNG by magic bytes (never trust the client's MIME type). */
function sniffImage(buf: Buffer): { type: string; ext: string } | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { type: "image/jpeg", ext: "jpg" };
  }
  if (buf.length > 8 && PNG_MAGIC.every((b, i) => buf[i] === b)) {
    return { type: "image/png", ext: "png" };
  }
  return null;
}

function revalidateNews() {
  revalidatePath("/[locale]/app/admin/news", "layout");
  revalidatePath("/[locale]/app/news", "layout");
  revalidatePath("/[locale]/app/dashboard", "page");
}

async function removeFile(key: string | null) {
  if (!key) return;
  try {
    await deletePrivate(key);
  } catch (e) {
    console.error("[news] failed to delete cover", key, e);
  }
}

/**
 * Create (no id) or update a news post. intent=notify continues to the
 * "Publish & notify" confirmation step (§11: show estimate before sending).
 */
export async function saveNewsAction(
  _prev: AdminFormState,
  fd: FormData,
): Promise<AdminFormState> {
  const admin = await adminOrNull();
  if (!admin) return { error: "forbidden" };

  const id = str(fd, "id") || null;
  const parsed = NewsSchema.safeParse({
    titleJa: str(fd, "titleJa"),
    titleEn: str(fd, "titleEn"),
    bodyJa: str(fd, "bodyJa"),
    bodyEn: str(fd, "bodyEn"),
    publishedAt: str(fd, "publishedAt"),
    pinned: fd.get("pinned") === "on",
    targetAudiences: fd.getAll("targetAudiences"),
  });
  if (!parsed.success)
    return { error: "validation", fieldErrors: toFieldErrors(parsed.error) };
  // Keep the legacy role column filled for older code (src/lib/audience.ts).
  const data = {
    ...parsed.data,
    targetRoles: rolesForAudiences(parsed.data.targetAudiences),
  };

  // Cover image: validate before touching storage or the database.
  const file = fd.get("cover");
  let cover: { buf: Buffer; type: string; ext: string } | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > COVER_MAX_BYTES) {
      return { error: "validation", fieldErrors: { cover: "coverSize" } };
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const kind = sniffImage(buf);
    if (!kind)
      return { error: "validation", fieldErrors: { cover: "coverType" } };
    cover = { buf, ...kind };
  }
  const removeCover = fd.get("removeCover") === "on";

  let existing: { coverUrl: string | null } | null = null;
  if (id) {
    if (!Id.safeParse(id).success) return { error: "notFound" };
    existing = await db.newsPost.findUnique({
      where: { id },
      select: { coverUrl: true },
    });
    if (!existing) return { error: "notFound" };
  }

  let coverUrl: string | null | undefined; // undefined = unchanged
  if (cover) {
    coverUrl = await putPrivate(
      `news/${randomUUID()}.${cover.ext}`,
      cover.buf,
      cover.type,
    );
  } else if (removeCover) {
    coverUrl = null;
  }

  const summary = {
    title: data.titleJa ?? data.titleEn,
    publishedAt: data.publishedAt?.toISOString() ?? null,
    pinned: data.pinned,
    targetAudiences: data.targetAudiences,
    coverChanged: coverUrl !== undefined,
  };

  let postId: string;
  if (id && existing) {
    await db.newsPost.update({
      where: { id },
      data: { ...data, ...(coverUrl !== undefined ? { coverUrl } : {}) },
    });
    if (coverUrl !== undefined && existing.coverUrl !== coverUrl)
      await removeFile(existing.coverUrl);
    await audit(admin.id, "news.update", { type: "NewsPost", id }, summary);
    postId = id;
  } else {
    const post = await db.newsPost.create({
      data: { ...data, coverUrl: coverUrl ?? null, createdById: admin.id },
    });
    await audit(
      admin.id,
      "news.create",
      { type: "NewsPost", id: post.id },
      summary,
    );
    postId = post.id;
  }
  revalidateNews();

  if (str(fd, "intent") === "notify")
    return go(`/app/admin/news/${postId}?notify=1`);
  if (!id) return go(`/app/admin/news/${postId}?created=1`);
  return { ok: true };
}

export async function deleteNewsAction(fd: FormData): Promise<void> {
  const admin = await actionAdmin();
  const id = Id.parse(str(fd, "id"));
  const post = await db.newsPost.findUnique({
    where: { id },
    select: { titleJa: true, titleEn: true, coverUrl: true },
  });
  if (post) {
    await db.newsPost.delete({ where: { id } });
    await removeFile(post.coverUrl);
    await audit(
      admin.id,
      "news.delete",
      { type: "NewsPost", id },
      {
        title: post.titleJa ?? post.titleEn,
      },
    );
    revalidateNews();
  }
  return go("/app/admin/news?deleted=1");
}

/** Archive a news post (hidden from members, never notified) or restore it. */
export async function setNewsArchivedAction(fd: FormData): Promise<void> {
  const admin = await actionAdmin();
  const id = Id.parse(str(fd, "id"));
  const archive = str(fd, "archive") === "1";
  await db.newsPost.update({
    where: { id },
    data: { archivedAt: archive ? new Date() : null },
  });
  await audit(admin.id, archive ? "news.archive" : "news.restore", {
    type: "NewsPost",
    id,
  });
  revalidateNews();
}

/**
 * Confirmed "Publish & notify" (§10.4, §11). Publishes now if the post is a
 * draft or scheduled, then notifies targeted ACTIVE members once.
 */
export async function notifyNewsAction(fd: FormData): Promise<void> {
  const admin = await actionAdmin();
  const id = Id.parse(str(fd, "id"));
  const post = await db.newsPost.findUnique({
    where: { id },
    select: { publishedAt: true, notifiedAt: true },
  });
  if (!post) return go("/app/admin/news");
  if (post.notifiedAt) return go(`/app/admin/news/${id}`);

  const now = new Date();
  const publishNow = !post.publishedAt || post.publishedAt > now;
  if (publishNow)
    await db.newsPost.update({ where: { id }, data: { publishedAt: now } });

  const result = await sendNewsNotification(id, now);
  await audit(
    admin.id,
    "news.notify",
    { type: "NewsPost", id },
    {
      publishedNow: publishNow,
      recipients: result?.recipients ?? 0,
      alreadyClaimed: result === null,
    },
  );
  revalidateNews();
  return go(`/app/admin/news/${id}?notified=1`);
}
