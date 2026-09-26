import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {};
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string | null =>
  typeof v === "string" && v ? v : typeof v === "number" ? String(v) : null;

function Row({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <>
      <dt className="text-slate-600">{label}</dt>
      <dd className="break-words">{value}</dd>
    </>
  );
}

function List({ children }: { children: ReactNode }) {
  return (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-[12rem_1fr]">
      {children}
    </dl>
  );
}

/**
 * Admin rendering of VerificationRequest.answers (§14 screen 15). Answers are
 * JSON written by the verify form; rendering is lenient about the shape.
 */
export async function AnswersView({ answers }: { answers: unknown }) {
  const t = await getTranslations("verify");
  const ta = await getTranslations("adminVerify");
  const tr = await getTranslations("roles");
  const a = obj(answers);
  const years = (s: Obj) => {
    const from = str(s.yearsFrom);
    if (!from) return null;
    return `${from}–${str(s.yearsTo) ?? t("fields.present")}`;
  };
  const grade = (v: unknown) =>
    typeof v === "number" ? tr("grade", { grade: v }) : null;
  const yesNo = (v: unknown) =>
    v === true
      ? t("didGraduate.yes")
      : v === false
        ? t("didGraduate.no")
        : null;
  const roleLabel = (r: unknown) =>
    typeof r === "string" ? tr(`role.${r}`) : "";

  const teacher = obj(a.teacher);
  const cs = obj(a.currentStudent);
  const cp = obj(a.currentParent);
  const fs = obj(a.formerStudent);
  const fp = obj(a.formerParent);

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 font-semibold">{ta("detail.basics")}</h3>
        <List>
          <Row label={t("fields.nameRomaji")} value={str(a.nameRomaji)} />
          <Row label={t("fields.nameKanji")} value={str(a.nameKanji)} />
          <Row label={t("fields.nameAtAis")} value={str(a.nameAtAis)} />
          <Row label={t("fields.dateOfBirth")} value={str(a.dateOfBirth)} />
          <Row
            label={t("fields.roles")}
            value={arr(a.roles).map(roleLabel).join(", ")}
          />
          <Row
            label={t("fields.locale")}
            value={
              a.locale === "en"
                ? "English"
                : a.locale === "ja"
                  ? "日本語"
                  : null
            }
          />
        </List>
      </section>

      {Object.keys(teacher).length ? (
        <section>
          <h3 className="mb-2 font-semibold">{tr("role.TEACHER")}</h3>
          <List>
            <Row label={ta("detail.years")} value={years(teacher)} />
            <Row label={t("fields.subjects")} value={str(teacher.subjects)} />
            <Row
              label={t("fields.schoolEmail")}
              value={str(teacher.schoolEmail)}
            />
          </List>
        </section>
      ) : null}

      {Object.keys(cs).length ? (
        <section>
          <h3 className="mb-2 font-semibold">{tr("role.CURRENT_STUDENT")}</h3>
          <List>
            <Row label={t("fields.grade")} value={grade(cs.grade)} />
            <Row
              label={t("fields.homeroomTeacher")}
              value={str(cs.homeroomTeacher)}
            />
            <Row label={t("fields.studentIdNo")} value={str(cs.studentIdNo)} />
          </List>
        </section>
      ) : null}

      {arr(cp.children).length ? (
        <section>
          <h3 className="mb-2 font-semibold">{tr("role.CURRENT_PARENT")}</h3>
          <ol className="space-y-2">
            {arr(cp.children)
              .map(obj)
              .map((c, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static list
                <li key={i} className="rounded-lg bg-slate-50 p-2">
                  <List>
                    <Row label={t("fields.childName")} value={str(c.name)} />
                    <Row label={t("fields.grade")} value={grade(c.grade)} />
                    <Row
                      label={t("fields.homeroomTeacher")}
                      value={str(c.homeroomTeacher)}
                    />
                  </List>
                </li>
              ))}
          </ol>
        </section>
      ) : null}

      {Object.keys(fs).length ? (
        <section>
          <h3 className="mb-2 font-semibold">{tr("role.FORMER_STUDENT")}</h3>
          <List>
            <Row label={ta("detail.years")} value={years(fs)} />
            <Row
              label={t("fields.lastDivision")}
              value={
                typeof fs.lastDivision === "string"
                  ? tr(`division.${fs.lastDivision}`)
                  : null
              }
            />
            <Row
              label={t("fields.graduationOrLeaveYear")}
              value={str(fs.graduationOrLeaveYear)}
            />
            <Row
              label={t("fields.didGraduate")}
              value={yesNo(fs.didGraduate)}
            />
            <Row
              label={t("fields.homeroomTeacherThen")}
              value={str(fs.homeroomTeacher)}
            />
            <Row
              label={t("fields.classmates")}
              value={arr(fs.classmates)
                .filter((c) => typeof c === "string")
                .join(", ")}
            />
            <Row
              label={t("fields.currentStage")}
              value={
                typeof fs.currentStage === "string"
                  ? tr(`stage.${fs.currentStage}`)
                  : null
              }
            />
          </List>
        </section>
      ) : null}

      {arr(fp.children).length ? (
        <section>
          <h3 className="mb-2 font-semibold">{tr("role.FORMER_PARENT")}</h3>
          <ol className="space-y-2">
            {arr(fp.children)
              .map(obj)
              .map((c, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static list
                <li key={i} className="rounded-lg bg-slate-50 p-2">
                  <List>
                    <Row label={t("fields.childName")} value={str(c.name)} />
                    <Row label={ta("detail.years")} value={years(c)} />
                  </List>
                </li>
              ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
