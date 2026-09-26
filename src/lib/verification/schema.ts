import { z } from "zod";
import { Division, LifeStage, RoleKey } from "@/generated/prisma/enums";
import { nameColumns } from "@/lib/names";

/**
 * Verification form (§6.1, §6.2, §7). Shared by the client form (per-step
 * validation) and the server action (authoritative validation). No server
 * imports here.
 *
 * Error messages are i18n keys under `verify.errors.*`.
 */

export const EVIDENCE_MAX_FILES = 3;
export const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;
export const EVIDENCE_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
] as const;
export const MAX_CHILDREN = 8;
export const MIN_YEAR = 1950;

export function maxYear(now: Date = new Date()): number {
  return now.getUTCFullYear() + 1;
}

export const ROLE_ORDER: readonly RoleKey[] = [
  RoleKey.FORMER_STUDENT,
  RoleKey.FORMER_PARENT,
  RoleKey.TEACHER,
  RoleKey.CURRENT_STUDENT,
  RoleKey.CURRENT_PARENT,
];

/** Form section key for each role. */
export const ROLE_SECTION = {
  TEACHER: "teacher",
  CURRENT_STUDENT: "currentStudent",
  CURRENT_PARENT: "currentParent",
  FORMER_STUDENT: "formerStudent",
  FORMER_PARENT: "formerParent",
} as const satisfies Record<RoleKey, string>;

export type RoleSection = (typeof ROLE_SECTION)[RoleKey];

// ---------------------------------------------------------------------------
// Primitive helpers

const text = (max = 200) => z.string().trim().max(max, "tooLong");
const requiredText = (max = 200) => text(max).min(1, "required");
const optionalText = (max = 200) =>
  text(max)
    .optional()
    .transform((v) => (v ? v : null));

function toNumber(v: unknown): unknown {
  if (v === "" || v === null || v === undefined) return undefined;
  if (typeof v === "string") return Number(v);
  return v;
}

const intIn = (min: number, max: number, code: string) =>
  z.preprocess(
    toNumber,
    z.number({ error: "required" }).int(code).min(min, code).max(max, code),
  );

const year = () => intIn(MIN_YEAR, maxYear(), "invalidYear");
const grade = () => intIn(0, 12, "invalidGrade");

const isoDate = z
  .string()
  .trim()
  .min(1, "required")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "invalidDate")
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return (
      !Number.isNaN(d.getTime()) &&
      d.toISOString().slice(0, 10) === s &&
      d.getUTCFullYear() >= 1900 &&
      d.getTime() <= Date.now()
    );
  }, "invalidDate");

function yearsOrdered(
  v: { yearsFrom: number; yearsTo: number | null },
  ctx: z.RefinementCtx,
) {
  if (v.yearsTo !== null && v.yearsTo < v.yearsFrom) {
    ctx.addIssue({ code: "custom", path: ["yearsTo"], message: "yearsOrder" });
  }
}

// ---------------------------------------------------------------------------
// Role sections (§6.2)

export const teacherSchema = z
  .object({
    yearsFrom: year(),
    yearsTo: z.preprocess(toNumber, z.number().int().optional()),
    present: z.boolean().default(false),
    subjects: requiredText(300),
    schoolEmail: z
      .string()
      .trim()
      .max(254)
      .optional()
      .transform((v) => (v ? v.toLowerCase() : null))
      .pipe(z.email("invalidEmail").nullable()),
  })
  .transform((v, ctx) => {
    let yearsTo: number | null = null;
    if (!v.present) {
      if (v.yearsTo === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["yearsTo"],
          message: "required",
        });
        return z.NEVER;
      }
      if (v.yearsTo < MIN_YEAR || v.yearsTo > maxYear()) {
        ctx.addIssue({
          code: "custom",
          path: ["yearsTo"],
          message: "invalidYear",
        });
        return z.NEVER;
      }
      yearsTo = v.yearsTo;
    }
    return {
      yearsFrom: v.yearsFrom,
      yearsTo,
      subjects: v.subjects,
      schoolEmail: v.schoolEmail,
    };
  })
  .superRefine(yearsOrdered);

/** 学年 (Cohort id); optional — "not listed / not sure" is allowed. */
const cohortId = () =>
  z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => v || null);

export const currentStudentSchema = z.object({
  cohortId: cohortId(),
  grade: grade(),
  homeroomTeacher: requiredText(),
  studentIdNo: optionalText(50),
});

export const currentChildSchema = z.object({
  name: requiredText(),
  grade: grade(),
  homeroomTeacher: optionalText(),
});

export const currentParentSchema = z.object({
  children: z
    .array(currentChildSchema)
    .min(1, "childrenRequired")
    .max(MAX_CHILDREN),
});

export const formerStudentSchema = z
  .object({
    cohortId: cohortId(),
    yearsFrom: year(),
    yearsTo: year(),
    lastDivision: z.enum(Division, { error: "required" }),
    graduationOrLeaveYear: year(),
    didGraduate: z
      .enum(["yes", "no"], { error: "required" })
      .transform((v) => v === "yes"),
    homeroomTeacher: optionalText(),
    classmates: z
      .array(text())
      .max(2)
      .transform((a) => a.filter(Boolean))
      .refine((a) => a.length >= 1, "classmateRequired"),
    currentStage: z.enum(LifeStage, { error: "required" }),
  })
  .superRefine(yearsOrdered);

export const formerChildSchema = z
  .object({
    name: requiredText(),
    yearsFrom: year(),
    yearsTo: year(),
  })
  .superRefine(yearsOrdered);

export const formerParentSchema = z.object({
  children: z
    .array(formerChildSchema)
    .min(1, "childrenRequired")
    .max(MAX_CHILDREN),
});

export const evidenceItemSchema = z.object({
  key: z.string().min(1).max(500),
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.enum(EVIDENCE_TYPES),
  size: z.number().int().positive().max(EVIDENCE_MAX_BYTES),
});

export type EvidenceItem = z.infer<typeof evidenceItemSchema>;

/** Storage-safe file name (used for the object key; the original name is kept separately). */
export function safeFileName(name: string): string {
  const base = name
    .normalize("NFKC")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^[._]+/, "");
  return (base || "file").slice(-80);
}

// ---------------------------------------------------------------------------
// Whole form

export function verificationSchema(opts: { requireKanji: boolean }) {
  return z
    .object({
      lastNameRomaji: requiredText(50),
      firstNameRomaji: requiredText(50),
      middleNameRomaji: optionalText(50),
      lastNameKanji: opts.requireKanji ? requiredText(50) : optionalText(50),
      firstNameKanji: opts.requireKanji ? requiredText(50) : optionalText(50),
      nameAtAis: optionalText(100),
      dateOfBirth: isoDate,
      roles: z
        .array(z.enum(RoleKey))
        .min(1, "rolesRequired")
        .transform((r) => ROLE_ORDER.filter((k) => r.includes(k))),
      locale: z.enum(["ja", "en"]),
      teacher: teacherSchema.optional(),
      currentStudent: currentStudentSchema.optional(),
      currentParent: currentParentSchema.optional(),
      formerStudent: formerStudentSchema.optional(),
      formerParent: formerParentSchema.optional(),
      evidence: z
        .array(evidenceItemSchema)
        .max(EVIDENCE_MAX_FILES, "tooManyFiles")
        .default([]),
    })
    .superRefine((v, ctx) => {
      for (const role of v.roles) {
        const section = ROLE_SECTION[role];
        if (!v[section])
          ctx.addIssue({
            code: "custom",
            path: [section],
            message: "required",
          });
      }
    })
    .transform((v) => {
      // Drop sections for roles that were not selected.
      // Also add the combined display names (nameRomaji / nameKanji).
      const out = { ...v, ...nameColumns(v) };
      for (const role of Object.keys(ROLE_SECTION) as RoleKey[]) {
        if (!v.roles.includes(role)) delete out[ROLE_SECTION[role]];
      }
      return out;
    });
}

export type VerificationData = z.output<ReturnType<typeof verificationSchema>>;

/** What is stored in VerificationRequest.answers. */
export type StoredAnswers = Omit<VerificationData, "evidence"> & { version: 1 };

// ---------------------------------------------------------------------------
// Client form state (string-valued so inputs stay controlled)

export type CurrentChildState = {
  name: string;
  grade: string;
  homeroomTeacher: string;
};
export type FormerChildState = {
  name: string;
  yearsFrom: string;
  yearsTo: string;
};

export type VerifyFormState = {
  lastNameRomaji: string;
  firstNameRomaji: string;
  middleNameRomaji: string;
  lastNameKanji: string;
  firstNameKanji: string;
  nameAtAis: string;
  dateOfBirth: string;
  roles: RoleKey[];
  locale: "ja" | "en";
  teacher: {
    yearsFrom: string;
    yearsTo: string;
    present: boolean;
    subjects: string;
    schoolEmail: string;
  };
  currentStudent: {
    cohortId: string;
    grade: string;
    homeroomTeacher: string;
    studentIdNo: string;
  };
  currentParent: { children: CurrentChildState[] };
  formerStudent: {
    cohortId: string;
    yearsFrom: string;
    yearsTo: string;
    lastDivision: string;
    graduationOrLeaveYear: string;
    didGraduate: "" | "yes" | "no";
    homeroomTeacher: string;
    classmates: [string, string];
    currentStage: string;
  };
  formerParent: { children: FormerChildState[] };
  evidence: EvidenceItem[];
};

export const emptyCurrentChild = (): CurrentChildState => ({
  name: "",
  grade: "",
  homeroomTeacher: "",
});
export const emptyFormerChild = (): FormerChildState => ({
  name: "",
  yearsFrom: "",
  yearsTo: "",
});

export function emptyFormState(locale: "ja" | "en"): VerifyFormState {
  return {
    lastNameRomaji: "",
    firstNameRomaji: "",
    middleNameRomaji: "",
    lastNameKanji: "",
    firstNameKanji: "",
    nameAtAis: "",
    dateOfBirth: "",
    roles: [],
    locale,
    teacher: {
      yearsFrom: "",
      yearsTo: "",
      present: false,
      subjects: "",
      schoolEmail: "",
    },
    currentStudent: {
      cohortId: "",
      grade: "",
      homeroomTeacher: "",
      studentIdNo: "",
    },
    currentParent: { children: [emptyCurrentChild()] },
    formerStudent: {
      cohortId: "",
      yearsFrom: "",
      yearsTo: "",
      lastDivision: "",
      graduationOrLeaveYear: "",
      didGraduate: "",
      homeroomTeacher: "",
      classmates: ["", ""],
      currentStage: "",
    },
    formerParent: { children: [emptyFormerChild()] },
    evidence: [],
  };
}

/** The JSON the client posts: only sections for the selected roles. */
export function toPayload(state: VerifyFormState): Record<string, unknown> {
  const {
    teacher,
    currentStudent,
    currentParent,
    formerStudent,
    formerParent,
    ...common
  } = state;
  const sections = {
    teacher,
    currentStudent,
    currentParent,
    formerStudent,
    formerParent,
  };
  const out: Record<string, unknown> = { ...common };
  for (const role of state.roles) {
    const key = ROLE_SECTION[role];
    out[key] = sections[key];
  }
  return out;
}

const s = (v: unknown): string =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : "";

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/**
 * Prefill for NEEDS_INFO resubmissions (§6.4): convert stored answers (numbers,
 * nulls) back into form state. Lenient — unknown/missing fields fall back to
 * defaults so older answer shapes never crash the form.
 */
export function answersToFormState(
  answers: unknown,
  locale: "ja" | "en",
  evidence: EvidenceItem[] = [],
): VerifyFormState {
  const base = emptyFormState(locale);
  const a = obj(answers);
  const roleSet = new Set<string>(Object.values(RoleKey));
  const t = obj(a.teacher);
  const cs = obj(a.currentStudent);
  const fs = obj(a.formerStudent);
  const cpChildren = arr(obj(a.currentParent).children).map(obj);
  const fpChildren = arr(obj(a.formerParent).children).map(obj);
  const classmates = arr(fs.classmates).map(s);
  const hasTeacher = Object.keys(t).length > 0;

  return {
    ...base,
    // Answers saved before names were split have no parts; the page fills
    // those from the user's current name (see onboarding/verify/page.tsx).
    lastNameRomaji: s(a.lastNameRomaji),
    firstNameRomaji: s(a.firstNameRomaji),
    middleNameRomaji: s(a.middleNameRomaji),
    lastNameKanji: s(a.lastNameKanji),
    firstNameKanji: s(a.firstNameKanji),
    nameAtAis: s(a.nameAtAis),
    dateOfBirth: s(a.dateOfBirth),
    roles: arr(a.roles).filter(
      (r): r is RoleKey => typeof r === "string" && roleSet.has(r),
    ),
    locale: a.locale === "en" || a.locale === "ja" ? a.locale : locale,
    teacher: hasTeacher
      ? {
          yearsFrom: s(t.yearsFrom),
          yearsTo: s(t.yearsTo),
          present: t.yearsTo === null || t.yearsTo === undefined,
          subjects: s(t.subjects),
          schoolEmail: s(t.schoolEmail),
        }
      : base.teacher,
    currentStudent: {
      cohortId: s(cs.cohortId),
      grade: s(cs.grade),
      homeroomTeacher: s(cs.homeroomTeacher),
      studentIdNo: s(cs.studentIdNo),
    },
    currentParent: {
      children: cpChildren.length
        ? cpChildren.map((c) => ({
            name: s(c.name),
            grade: s(c.grade),
            homeroomTeacher: s(c.homeroomTeacher),
          }))
        : base.currentParent.children,
    },
    formerStudent: {
      cohortId: s(fs.cohortId),
      yearsFrom: s(fs.yearsFrom),
      yearsTo: s(fs.yearsTo),
      lastDivision: s(fs.lastDivision),
      graduationOrLeaveYear: s(fs.graduationOrLeaveYear),
      didGraduate:
        fs.didGraduate === true ? "yes" : fs.didGraduate === false ? "no" : "",
      homeroomTeacher: s(fs.homeroomTeacher),
      classmates: [classmates[0] ?? "", classmates[1] ?? ""],
      currentStage: s(fs.currentStage),
    },
    formerParent: {
      children: fpChildren.length
        ? fpChildren.map((c) => ({
            name: s(c.name),
            yearsFrom: s(c.yearsFrom),
            yearsTo: s(c.yearsTo),
          }))
        : base.formerParent.children,
    },
    evidence,
  };
}

// ---------------------------------------------------------------------------
// Errors

/** Flatten Zod issues into { "formerStudent.yearsTo": "invalidYear" } (first wins). */
export function issuesToErrors(
  issues: readonly z.core.$ZodIssue[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const path = issue.path.map(String).join(".") || "_form";
    if (!(path in out)) out[path] = normalizeMessage(issue.message);
  }
  return out;
}

const KNOWN_CODES = new Set([
  "required",
  "tooLong",
  "invalidYear",
  "invalidGrade",
  "invalidDate",
  "invalidEmail",
  "yearsOrder",
  "rolesRequired",
  "childrenRequired",
  "classmateRequired",
  "tooManyFiles",
]);

function normalizeMessage(message: string): string {
  return KNOWN_CODES.has(message) ? message : "invalid";
}

/** Form steps (§14 screen 4). Used to scope per-step validation. */
export const STEPS = ["basics", "roles", "evidence"] as const;
export type Step = (typeof STEPS)[number];

export function stepOfPath(path: string): Step {
  const head = path.split(".")[0];
  if (
    [
      "teacher",
      "currentStudent",
      "currentParent",
      "formerStudent",
      "formerParent",
    ].includes(head)
  )
    return "roles";
  if (head === "evidence") return "evidence";
  return "basics";
}
