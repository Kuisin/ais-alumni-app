import { z } from "zod";
import { Division, type RoleKey } from "@/generated/prisma/enums";

/**
 * AIS record (在籍情報) correction requests. Members can't edit these UserRole
 * fields themselves; they propose new values and an admin approves them.
 * CURRENT_PARENT has no role-level record (children are family links).
 */
export const RECORD_FIELDS = {
  FORMER_STUDENT: [
    "yearsFrom",
    "yearsTo",
    "lastDivision",
    "graduationOrLeaveYear",
    "didGraduate",
  ],
  TEACHER: ["yearsFrom", "yearsTo", "subjects"],
  CURRENT_STUDENT: ["currentGrade", "studentIdNo"],
  FORMER_PARENT: ["yearsFrom", "yearsTo"],
  CURRENT_PARENT: [],
} as const satisfies Record<RoleKey, readonly string[]>;

export type RecordField =
  | "yearsFrom"
  | "yearsTo"
  | "lastDivision"
  | "graduationOrLeaveYear"
  | "didGraduate"
  | "subjects"
  | "currentGrade"
  | "studentIdNo";

export type RecordValues = Partial<{
  yearsFrom: number | null;
  yearsTo: number | null;
  lastDivision: Division | null;
  graduationOrLeaveYear: number | null;
  didGraduate: boolean | null;
  subjects: string | null;
  currentGrade: number | null;
  studentIdNo: string | null;
}>;

export function fieldsFor(role: RoleKey): readonly RecordField[] {
  return RECORD_FIELDS[role];
}

export function hasRecord(role: RoleKey): boolean {
  return fieldsFor(role).length > 0;
}

/** The role's current record values, limited to its correctable fields. */
export function snapshot(
  role: RoleKey,
  row: Record<RecordField, unknown>,
): RecordValues {
  return Object.fromEntries(
    fieldsFor(role).map((f) => [f, row[f] ?? null]),
  ) as RecordValues;
}

const year = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1950 || n > 2100) {
      ctx.addIssue({ code: "custom", message: "invalidYear" });
      return z.NEVER;
    }
    return n;
  });

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "tooLong")
    .transform((v) => v || null);

const FIELD_SCHEMAS: Record<RecordField, z.ZodType<unknown, string>> = {
  yearsFrom: year,
  yearsTo: year,
  graduationOrLeaveYear: year,
  lastDivision: z
    .string()
    .transform((v) => v || null)
    .pipe(z.enum(Division).nullable()),
  didGraduate: z
    .string()
    .transform((v) => (v === "true" ? true : v === "false" ? false : null)),
  subjects: text(300),
  currentGrade: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null;
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0 || n > 12) {
        ctx.addIssue({ code: "custom", message: "invalidGrade" });
        return z.NEVER;
      }
      return n;
    }),
  studentIdNo: text(50),
};

export type ParseResult =
  | { ok: true; values: RecordValues }
  | { ok: false; errors: Partial<Record<RecordField, string>> };

/** Parse form strings for a role's fields into typed values. */
export function parseRecordForm(
  role: RoleKey,
  input: Record<string, string>,
): ParseResult {
  const values: Record<string, unknown> = {};
  const errors: Partial<Record<RecordField, string>> = {};
  for (const f of fieldsFor(role)) {
    const r = FIELD_SCHEMAS[f].safeParse(input[f] ?? "");
    if (r.success) values[f] = r.data;
    else errors[f] = r.error.issues[0]?.message ?? "invalid";
  }
  const from = values.yearsFrom as number | null | undefined;
  const to = values.yearsTo as number | null | undefined;
  if (from != null && to != null && to < from) errors.yearsTo = "yearsOrder";
  return Object.keys(errors).length
    ? { ok: false, errors }
    : { ok: true, values: values as RecordValues };
}

/** Only the fields whose proposed value differs from the current one. */
export function diffRecord(
  current: RecordValues,
  proposed: RecordValues,
): RecordValues {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(proposed)) {
    const before = (current as Record<string, unknown>)[k] ?? null;
    if ((v ?? null) !== before) out[k] = v ?? null;
  }
  return out as RecordValues;
}

/** Form defaults (strings) from current values. */
export function toFormValues(
  role: RoleKey,
  v: RecordValues,
): Record<string, string> {
  return Object.fromEntries(
    fieldsFor(role).map((f) => {
      const x = (v as Record<string, unknown>)[f];
      return [f, x === null || x === undefined ? "" : String(x)];
    }),
  );
}
