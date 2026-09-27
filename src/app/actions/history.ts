"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { educationSchema, workSchema } from "@/lib/history";
import type { OrgKind, OrgOption } from "@/lib/organizations";
import { resolveOrg, searchOrgs } from "@/lib/organizations-db";
import { AuthError, actionActive, type CurrentUser } from "@/lib/session";
import { syncStageFromHistory } from "@/lib/stage";

export type HistoryFormState = {
  ok?: boolean;
  /** key in the "history" namespace */
  message?: string;
  fieldErrors?: Record<string, string>;
} | null;

async function me(): Promise<CurrentUser | null> {
  try {
    return await actionActive();
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

/** Keep a former student's current stage in step with their ongoing entries. */
async function refreshStage(user: CurrentUser): Promise<void> {
  await syncStageFromHistory(user.id);
}

/** Add or edit one 学歴 / 職歴 entry (own entries only). */
export async function saveHistoryAction(
  _prev: HistoryFormState,
  fd: FormData,
): Promise<HistoryFormState> {
  const user = await me();
  if (!user) return { ok: false, message: "errors.forbidden" };
  const kind = str(fd, "kind");
  const id = str(fd, "id");
  const common = {
    startYear: str(fd, "startYear"),
    endYear: str(fd, "endYear"),
    visibility: str(fd, "visibility"),
  };

  if (kind === "education") {
    const parsed = educationSchema.safeParse({
      ...common,
      level: str(fd, "level"),
      school: str(fd, "school"),
      field: str(fd, "field"),
    });
    if (!parsed.success) return invalid(parsed.error.issues);
    // Picked from the list (id) or typed as a new school (created once).
    const { school, ...rest } = parsed.data;
    const schoolId = await resolveOrg(
      "school",
      { id: str(fd, "schoolId"), name: school },
      user.id,
    );
    if (!schoolId) return invalid([{ path: ["school"], message: "required" }]);
    const data = { ...rest, schoolId };
    if (id) {
      const res = await db.educationEntry.updateMany({
        where: { id, userId: user.id },
        data,
      });
      if (res.count !== 1) return { ok: false, message: "errors.forbidden" };
    } else {
      await db.educationEntry.create({ data: { ...data, userId: user.id } });
    }
  } else if (kind === "work") {
    const parsed = workSchema.safeParse({
      ...common,
      company: str(fd, "company"),
      title: str(fd, "title"),
      industry: str(fd, "industry"),
    });
    if (!parsed.success) return invalid(parsed.error.issues);
    const { company, ...rest } = parsed.data;
    const companyId = await resolveOrg(
      "company",
      { id: str(fd, "companyId"), name: company },
      user.id,
    );
    if (!companyId)
      return invalid([{ path: ["company"], message: "required" }]);
    const data = { ...rest, companyId };
    if (id) {
      const res = await db.workEntry.updateMany({
        where: { id, userId: user.id },
        data,
      });
      if (res.count !== 1) return { ok: false, message: "errors.forbidden" };
    } else {
      await db.workEntry.create({ data: { ...data, userId: user.id } });
    }
  } else {
    return { ok: false, message: "errors.invalid" };
  }

  await refreshStage(user);
  refresh();
  return { ok: true, message: id ? "saved" : "added" };
}

function invalid(
  issues: readonly { path: PropertyKey[]; message: string }[],
): HistoryFormState {
  const fieldErrors: Record<string, string> = {};
  for (const i of issues) {
    const k = String(i.path[0] ?? "_");
    fieldErrors[k] ??= i.message;
  }
  return { ok: false, message: "errors.validation", fieldErrors };
}

export async function deleteHistoryAction(
  kind: "education" | "work",
  id: string,
): Promise<void> {
  const user = await actionActive();
  if (kind === "education")
    await db.educationEntry.deleteMany({ where: { id, userId: user.id } });
  else await db.workEntry.deleteMany({ where: { id, userId: user.id } });
  await refreshStage(user);
  refresh();
}

/** Suggestions for the school / company picker (signed-in members only). */
export async function searchOrgsAction(
  kind: OrgKind,
  q: string,
): Promise<OrgOption[]> {
  if (!(await me())) return [];
  if ((kind !== "school" && kind !== "company") || typeof q !== "string")
    return [];
  return searchOrgs(kind, q.slice(0, 80));
}
