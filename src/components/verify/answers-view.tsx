import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { cohortLabel, elementaryEndFor, gradeLabel } from "@/lib/cohorts";
import { composeKanji, composeRomaji } from "@/lib/names";
import { isCurrentTeacher, studentStatus } from "@/lib/school";

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {};
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string | null =>
  typeof v === "string" && v ? v : typeof v === "number" ? String(v) : null;
const num = (v: unknown): number | null => (typeof v === "number" ? v : null);

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
 * JSON written by the sign-up wizard (version 2); rendering is lenient. The
 * status line shows what the app worked out from the 学年 and years.
 */
export async function AnswersView({ answers }: { answers: unknown }) {
  const t = await getTranslations("verify");
  const ta = await getTranslations("adminVerify");
  const locale = (await getLocale()) === "en" ? "en" : "ja";
  const a = obj(answers);
  const student = obj(a.student);
  const teacher = obj(a.teacher);
  const children = arr(obj(a.parent).children).map(obj);

  const classLabel = (n: unknown) =>
    typeof n === "number"
      ? cohortLabel(
          { number: n, elementaryEndYear: elementaryEndFor(n) },
          locale,
        )
      : null;
  const statusOf = (n: unknown, left: unknown) => {
    if (typeof n !== "number") return null;
    const st = studentStatus(elementaryEndFor(n), num(left));
    if (st.current)
      return st.currentGrade !== null
        ? t("preview.current", { grade: gradeLabel(st.currentGrade, locale) })
        : t("preview.upcoming");
    return st.didGraduate
      ? t("preview.graduated", { year: st.graduationOrLeaveYear ?? "" })
      : t("preview.left", { year: st.graduationOrLeaveYear ?? "" });
  };
  const years = (s: Obj) => {
    const from = str(s.joinedYear);
    return from ? `${from}–${str(s.leftYear) ?? ""}` : null;
  };

  if (a.version !== 2) {
    return <p className="text-sm text-slate-600">{ta("detail.oldFormat")}</p>;
  }

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 font-semibold">{ta("detail.basics")}</h3>
        <List>
          <Row
            label={t("fields.nameRomaji")}
            value={composeRomaji({
              lastNameRomaji: str(a.lastNameRomaji),
              firstNameRomaji: str(a.firstNameRomaji),
              middleNameRomaji: str(a.middleNameRomaji),
            })}
          />
          <Row
            label={t("fields.nameKanji")}
            value={composeKanji({
              lastNameKanji: str(a.lastNameKanji),
              firstNameKanji: str(a.firstNameKanji),
            })}
          />
          <Row label={t("fields.nameAtAis")} value={str(a.nameAtAis)} />
          <Row label={t("fields.dateOfBirth")} value={str(a.dateOfBirth)} />
          <Row
            label={t("review.types")}
            value={arr(a.types)
              .map((x) => t(`types.${String(x)}.title`))
              .join("・")}
          />
          {a.diplomaUnavailable === true ? (
            <Row label={t("diploma.title")} value={t("diploma.unavailable")} />
          ) : null}
          <Row
            label={t("fields.locale")}
            value={a.locale === "en" ? "English" : "日本語"}
          />
        </List>
      </section>

      {Object.keys(student).length ? (
        <section>
          <h3 className="mb-2 font-semibold">{t("types.STUDENT.title")}</h3>
          <List>
            <Row
              label={t("fields.cohort")}
              value={classLabel(student.cohortNumber)}
            />
            <Row label={ta("detail.years")} value={years(student)} />
            <Row
              label={ta("detail.status")}
              value={statusOf(student.cohortNumber, student.leftYear)}
            />
            <Row
              label={t("fields.homeroomTeacher")}
              value={str(student.homeroomTeacher)}
            />
            <Row
              label={t("fields.studentIdNo")}
              value={str(student.studentIdNo)}
            />
            <Row
              label={t("fields.classmates")}
              value={arr(student.classmates).map(String).join("、")}
            />
          </List>
        </section>
      ) : null}

      {children.length ? (
        <section>
          <h3 className="mb-2 font-semibold">{t("types.PARENT.title")}</h3>
          <ol className="space-y-2">
            {children.map((c, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: answers are a fixed list
              <li key={i} className="rounded-lg bg-slate-50 p-3">
                <List>
                  <Row
                    label={t("fields.childName")}
                    value={
                      c.mode === "new"
                        ? [
                            composeKanji({
                              lastNameKanji: str(c.lastNameKanji),
                              firstNameKanji: str(c.firstNameKanji),
                            }),
                            composeRomaji({
                              lastNameRomaji: str(c.lastNameRomaji),
                              firstNameRomaji: str(c.firstNameRomaji),
                              middleNameRomaji: null,
                            }),
                          ]
                            .filter(Boolean)
                            .join(" / ")
                        : str(c.name)
                    }
                  />
                  <Row
                    label={ta("children.source.title")}
                    value={
                      c.mode === "existing"
                        ? ta("children.source.registered")
                        : c.mode === "new"
                          ? ta("children.source.created")
                          : ta("children.source.nameOnly")
                    }
                  />
                  <Row label={ta("children.dob")} value={str(c.dateOfBirth)} />
                  <Row
                    label={t("fields.cohort")}
                    value={classLabel(c.cohortNumber)}
                  />
                  <Row label={ta("detail.years")} value={years(c)} />
                  <Row
                    label={ta("detail.status")}
                    value={statusOf(c.cohortNumber, c.leftYear)}
                  />
                  <Row
                    label={ta("children.studentId")}
                    value={str(c.studentIdNo)}
                  />
                </List>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {Object.keys(teacher).length ? (
        <section>
          <h3 className="mb-2 font-semibold">{t("types.TEACHER.title")}</h3>
          <List>
            <Row label={ta("detail.years")} value={years(teacher)} />
            <Row
              label={ta("detail.status")}
              value={
                isCurrentTeacher(num(teacher.leftYear))
                  ? t("preview.teacherCurrent")
                  : t("preview.teacherFormer", {
                      year: str(teacher.leftYear) ?? "",
                    })
              }
            />
            <Row label={t("fields.subjects")} value={str(teacher.subjects)} />
            <Row
              label={t("fields.schoolEmail")}
              value={str(teacher.schoolEmail)}
            />
          </List>
        </section>
      ) : null}
    </div>
  );
}
