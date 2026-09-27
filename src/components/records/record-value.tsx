import { useTranslations } from "next-intl";
import type { RoleKey } from "@/generated/prisma/enums";
import type { RecordField } from "@/lib/record-requests";

const KNOWN_FIELDS = new Set<string>([
  "cohort",
  "yearsFrom",
  "yearsTo",
  "subjects",
  "studentIdNo",
] satisfies RecordField[]);

/** Human-readable value of one AIS record field. */
export function RecordValue({
  field,
  value,
  role,
  cohortLabels,
}: {
  field: RecordField;
  value: unknown;
  role: RoleKey;
  /** 学年 number → label */
  cohortLabels?: Record<string, string>;
}) {
  const t = useTranslations("records");
  const tc = useTranslations("common");
  if (value === null || value === undefined || value === "") {
    // A teacher with no end year is still at AIS.
    return (
      <>
        {field === "yearsTo" && role === "TEACHER" ? t("stillTeaching") : "—"}
      </>
    );
  }
  // 学年 number; label from the choices list, else "第N期".
  if (field === "cohort")
    return (
      <>
        {cohortLabels?.[String(value)] ??
          tc("cohortNumber", { number: String(value) })}
      </>
    );
  return <>{String(value)}</>;
}

/** Table of field | before | after for a proposed change. */
export function RecordDiff({
  role,
  current,
  proposed,
  cohortLabels,
}: {
  role: RoleKey;
  current: Record<string, unknown>;
  proposed: Record<string, unknown>;
  cohortLabels?: Record<string, string>;
}) {
  const t = useTranslations("records");
  return (
    <table className="w-full text-left text-sm">
      <thead className="text-slate-600">
        <tr>
          <th scope="col" className="py-1 pr-3 font-medium">
            {t("diff.field")}
          </th>
          <th scope="col" className="py-1 pr-3 font-medium">
            {t("diff.current")}
          </th>
          <th scope="col" className="py-1 font-medium">
            {t("diff.proposed")}
          </th>
        </tr>
      </thead>
      <tbody>
        {Object.keys(proposed)
          // Requests from older forms may carry fields that no longer exist.
          .filter((f) => KNOWN_FIELDS.has(f))
          .map((f) => (
            <tr key={f} className="border-t border-slate-100">
              <th
                scope="row"
                className="py-1.5 pr-3 font-normal text-slate-700"
              >
                {t(`fields.${f}`)}
              </th>
              <td className="py-1.5 pr-3 text-slate-500 line-through decoration-slate-400">
                <RecordValue
                  field={f as RecordField}
                  value={current[f]}
                  role={role}
                  cohortLabels={cohortLabels}
                />
              </td>
              <td className="py-1.5 font-semibold text-brand-800">
                <RecordValue
                  field={f as RecordField}
                  value={proposed[f]}
                  role={role}
                  cohortLabels={cohortLabels}
                />
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}
