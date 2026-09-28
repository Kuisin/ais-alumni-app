import { expect, type Page, test } from "@playwright/test";
import { Client } from "pg";
import { createActiveGraduate, signInWithEmail } from "./helpers";

async function sql(text: string, values: unknown[]) {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    return (await db.query(text, values)).rows;
  } finally {
    await db.end();
  }
}

/** Start a post from the member news list and save it as a draft. */
async function draftFromNewsList(page: Page, title: string) {
  await page.goto("/en/app/news");
  await page.getByRole("link", { name: "New post" }).click();
  await expect(page).toHaveURL(/\/en\/app\/news\/new$/);
  await page.getByLabel("Title (Japanese)").fill(title);
  await page.getByLabel("Body (Japanese)").fill("Body");
}

async function saveDraft(page: Page) {
  await page.getByRole("radio", { name: /^Save as draft/ }).check();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("The post has been saved.")).toBeVisible();
}

async function savedAudience(title: string) {
  const [row] = await sql(
    `SELECT audience FROM "NewsPost" WHERE "titleJa" = $1`,
    [title],
  );
  return row.audience as { groups: string[]; cohortIds: string[] };
}

test("学年代表 post ニュース to their own 学年 only", async ({ page }) => {
  const stamp = Date.now();
  const rep = await createActiveGraduate(`Rep R${stamp}`, "1993-03-03");
  await sql(
    `UPDATE "UserRole" SET "cohortId" = (SELECT id FROM "Cohort" WHERE number = 5)
     WHERE "userId" = $1`,
    [rep.id],
  );
  await sql(
    `INSERT INTO "UserPosition" (id, "userId", position, "cohortId")
     VALUES ($1, $2, 'STUDENT_LEADER', (SELECT id FROM "Cohort" WHERE number = 5))`,
    [`pos${stamp}`, rep.id],
  );
  const title = `E2E rep news ${stamp}`;

  await signInWithEmail(page, rep.email);
  await draftFromNewsList(page, title);
  // Only their 学年 is offered: no 「全員」, groups or individual members.
  await expect(page.getByText("Your 学年", { exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /^Class 5\b/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: /^Everyone/ })).toHaveCount(0);
  await saveDraft(page);

  // Managed from admin mode, which lists only their own posts.
  await expect(page).toHaveURL(/\/en\/app\/admin\/news\/[^/?]+/);
  const [cohort] = await sql(`SELECT id FROM "Cohort" WHERE number = 5`, []);
  expect(await savedAudience(title)).toMatchObject({
    groups: [],
    cohortIds: [cohort.id],
  });
  await page.goto("/en/app/admin/news");
  await expect(page.getByText(title)).toBeVisible();
  await expect(page.getByText("E2E news", { exact: false })).toHaveCount(0);
});

test("current teachers' ニュース always reach current teachers", async ({
  page,
}) => {
  const stamp = Date.now();
  const teacher = await createActiveGraduate(`Teach T${stamp}`, "1980-01-01");
  await sql(
    `INSERT INTO "UserRole" (id, "userId", role, "teacherStatus") VALUES ($1, $2, 'TEACHER', 'CURRENT')`,
    [`${teacher.id}t`, teacher.id],
  );
  const title = `E2E teacher news ${stamp}`;

  await signInWithEmail(page, teacher.email);
  await draftFromNewsList(page, title);
  await expect(
    page.getByText("Current teachers always receive the news you send."),
  ).toBeVisible();
  await page.getByRole("radio", { name: /^Choose conditions/ }).check();
  const teachers = page.getByRole("checkbox", {
    name: /^Current teachers & staff/,
  });
  await expect(teachers).toBeChecked();
  await expect(teachers).toBeDisabled();
  await page.getByRole("checkbox", { name: /^Graduate\b/ }).check();
  await saveDraft(page);

  expect((await savedAudience(title)).groups.sort()).toEqual([
    "GRADUATE",
    "TEACHER_CURRENT",
  ]);
});

test("members without a posting right see no New post button", async ({
  page,
}) => {
  const member = await createActiveGraduate(
    `Plain P${Date.now()}`,
    "1995-05-05",
  );
  await signInWithEmail(page, member.email);
  await page.goto("/en/app/news");
  await expect(page.getByRole("heading", { name: "News" })).toBeVisible();
  await expect(page.getByRole("link", { name: "New post" })).toHaveCount(0);
  await page.goto("/en/app/news/new");
  await expect(page).toHaveURL(/\/en\/app\/news$/);
});
