"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import {
  cohortNumberFor,
  defaultGraduated,
  elementaryEndFor,
  latestCohortNumber,
  suggestedStartYear,
} from "@/lib/cohorts";
import { db } from "@/lib/db";
import { AuthError, actionAdmin } from "@/lib/session";

/** message = key in the "cohorts" namespace */
export type CohortFormState = {
  ok?: boolean;
  message?: string;
  values?: Record<string, string>;
} | null;

const year = z.coerce.number().int().min(1990).max(2100);

const cohortSchema = z
  .object({
    elementaryStartYear: year,
    elementaryEndYear: year,
    note: z.string().trim().max(200),
  })
  .refine((v) => v.elementaryEndYear > v.elementaryStartYear, {
    message: "yearsOrder",
  });

async function admin() {
  try {
    return await actionAdmin();
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}

async function numberTaken(
  number: number,
  exceptId?: string,
): Promise<boolean> {
  const row = await db.cohort.findUnique({
    where: { number },
    select: { id: true },
  });
  return Boolean(row && row.id !== exceptId);
}

export async function createCohortAction(
  _prev: CohortFormState,
  fd: FormData,
): Promise<CohortFormState> {
  const me = await admin();
  if (!me) return { ok: false, message: "errors.forbidden" };
  const endRaw = String(fd.get("elementaryEndYear") ?? "");
  const startRaw =
    String(fd.get("elementaryStartYear") ?? "") ||
    (endRaw ? String(suggestedStartYear(Number(endRaw))) : "");
  const parsed = cohortSchema.safeParse({
    elementaryStartYear: startRaw,
    elementaryEndYear: endRaw,
    note: String(fd.get("note") ?? ""),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: `errors.${parsed.error.issues[0]?.message === "yearsOrder" ? "yearsOrder" : "years"}`,
    };
  }
  const number = cohortNumberFor(parsed.data.elementaryEndYear);
  if (number < 1) return { ok: false, message: "errors.beforeFirst" };
  if (await numberTaken(number)) return { ok: false, message: "errors.exists" };
  const cohort = await db.cohort.create({
    data: {
      number,
      ...parsed.data,
      note: parsed.data.note || null,
      graduated: fd.get("graduated") === "on",
    },
  });
  await audit(
    me.id,
    "cohort.created",
    { type: "Cohort", id: cohort.id },
    { number },
  );
  refresh();
  return { ok: true, message: "created" };
}

/** Create every missing 学年 from 第1期 up to this year's 1st graders. */
export async function createMissingCohortsAction(): Promise<void> {
  const me = await actionAdmin();
  const existing = new Set(
    (await db.cohort.findMany({ select: { number: true } })).map(
      (c) => c.number,
    ),
  );
  const toCreate = [];
  for (let n = 1; n <= latestCohortNumber(); n++) {
    if (existing.has(n)) continue;
    const end = elementaryEndFor(n);
    toCreate.push({
      number: n,
      elementaryEndYear: end,
      elementaryStartYear: suggestedStartYear(end),
      graduated: defaultGraduated(end),
    });
  }
  if (toCreate.length) {
    await db.cohort.createMany({ data: toCreate, skipDuplicates: true });
    await audit(me.id, "cohort.bulk_created", undefined, {
      numbers: toCreate.map((c) => c.number),
    });
  }
  refresh();
}

export async function updateCohortAction(
  _prev: CohortFormState,
  fd: FormData,
): Promise<CohortFormState> {
  const me = await admin();
  if (!me) return { ok: false, message: "errors.forbidden" };
  const id = String(fd.get("id") ?? "");
  const parsed = cohortSchema.safeParse({
    elementaryStartYear: String(fd.get("elementaryStartYear") ?? ""),
    elementaryEndYear: String(fd.get("elementaryEndYear") ?? ""),
    note: String(fd.get("note") ?? ""),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: `errors.${parsed.error.issues[0]?.message === "yearsOrder" ? "yearsOrder" : "years"}`,
    };
  }
  // The number follows the year the class finishes 6th grade.
  const number = cohortNumberFor(parsed.data.elementaryEndYear);
  if (number < 1) return { ok: false, message: "errors.beforeFirst" };
  if (await numberTaken(number, id))
    return { ok: false, message: "errors.exists" };
  await db.cohort.update({
    where: { id },
    data: { number, ...parsed.data, note: parsed.data.note || null },
  });
  await audit(
    me.id,
    "cohort.updated",
    { type: "Cohort", id },
    { number, ...parsed.data },
  );
  refresh();
  return { ok: true, message: "saved" };
}

export async function setCohortGraduatedAction(
  id: string,
  graduated: boolean,
): Promise<void> {
  const me = await actionAdmin();
  await db.cohort.update({ where: { id }, data: { graduated } });
  await audit(me.id, graduated ? "cohort.graduated" : "cohort.reopened", {
    type: "Cohort",
    id,
  });
  refresh();
}

/** Only unused 学年 can be deleted (no members, leaders or notifications). */
export async function deleteCohortAction(id: string): Promise<void> {
  const me = await actionAdmin();
  const used = await db.cohort.findUnique({
    where: { id },
    select: {
      number: true,
      _count: { select: { roles: true, positions: true, broadcasts: true } },
    },
  });
  if (!used) return;
  const { roles, positions, broadcasts } = used._count;
  if (roles + positions + broadcasts > 0) return;
  await db.cohort.delete({ where: { id } });
  await audit(
    me.id,
    "cohort.deleted",
    { type: "Cohort", id },
    { number: used.number },
  );
  refresh();
}
