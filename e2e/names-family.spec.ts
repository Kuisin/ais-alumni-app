import { expect, test } from "@playwright/test";
import { Client } from "pg";
import {
  asListed,
  createActiveGraduate,
  createActiveMember,
  signInWithEmail,
} from "./helpers";

async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    return (await db.query(text, params)).rows as T[];
  } finally {
    await db.end();
  }
}

test("profiles and cards show every recorded name", async ({ page }) => {
  const stamp = Date.now();
  const m = await createActiveGraduate(`Taro Yamada${stamp}`, "1990-05-05");
  await sql(
    `UPDATE "User" SET "nameKanji" = '山田 太郎', "nameKana" = 'ヤマダ タロウ', "nameAtAis" = 'Taro Suzuki' WHERE id = $1`,
    [m.id],
  );
  const viewer = await createActiveGraduate(
    `Name Viewer${stamp}`,
    "1990-01-01",
  );
  await signInWithEmail(page, viewer.email);
  await page.goto(`/en/app/members/${m.id}`);
  const header = page.getByRole("main").locator("h1").locator("..");
  await expect(header.getByText("山田 太郎（ヤマダ タロウ）")).toBeVisible();
  await expect(header.getByText(/Taro Suzuki/)).toBeVisible();
  // Directory card too.
  await page.goto(`/en/app/directory?q=Yamada${stamp}`);
  await expect(page.getByText("山田 太郎（ヤマダ タロウ）")).toBeVisible();
});

test("several entries marked current: the newest sets the status, with a warning", async ({
  page,
}) => {
  const stamp = Date.now();
  const m = await createActiveGraduate(`Two Jobs${stamp}`, "1990-01-01");
  const companies = [`Old Co ${stamp}`, `New Co ${stamp}`];
  for (const [i, name] of companies.entries()) {
    await sql(
      `INSERT INTO "Company" (id, name, "nameKey") VALUES ($1, $2, $3)`,
      [`co${stamp}${i}`, name, name.toLowerCase()],
    );
    await sql(
      `INSERT INTO "WorkEntry" (id, "userId", "companyId", "startYear", "endYear")
       VALUES ($1, $2, $3, $4, NULL)`,
      [`we${stamp}${i}`, m.id, `co${stamp}${i}`, 2015 + i * 5],
    );
  }
  await signInWithEmail(page, m.email);
  await page.goto("/en/app/profile/history");
  await expect(page.getByText("2 entries are marked current")).toBeVisible();
  await expect(page.getByText(`“New Co ${stamp}”`)).toBeVisible();
});

test("admins link and unlink family on the member page", async ({
  browser,
}) => {
  const stamp = Date.now();
  const child = await createActiveGraduate(`Kid Fam${stamp}`, "2000-01-01");
  const parentId = await createActiveMember(`Mum Fam${stamp}`);
  await sql(
    `INSERT INTO "UserRole" (id, "userId", role) VALUES ($1, $2, 'FORMER_PARENT')`,
    [`${parentId}r`, parentId],
  );

  const admin = await browser.newPage();
  await signInWithEmail(admin, "admin@example.com");
  await admin.goto(`/en/app/admin/members/${child.id}#family`);
  const section = admin.locator("#family");
  await section.getByLabel("Link as").selectOption("parent");
  await section.getByLabel("Search by name").fill(`Fam${stamp}`);
  await section
    .getByRole("button", {
      name: `Link ${asListed(`Mum Fam${stamp}`)} as Parent`,
    })
    .click();
  await expect(section.getByText("Confirmed", { exact: true })).toBeVisible();
  const [a] = await sql<{ p: string | null; c: string | null }>(
    `SELECT (SELECT "familyId" FROM "User" WHERE id = $1) AS p,
            (SELECT "familyId" FROM "User" WHERE id = $2) AS c`,
    [parentId, child.id],
  );
  expect(a.p).not.toBeNull();
  expect(a.p).toBe(a.c);

  admin.once("dialog", (d) => d.accept());
  await section
    .getByRole("button", { name: `Unlink ${asListed(`Mum Fam${stamp}`)}` })
    .click();
  await expect(section.getByText("No family linked.")).toBeVisible();
  const [b] = await sql<{ p: string | null; c: string | null }>(
    `SELECT (SELECT "familyId" FROM "User" WHERE id = $1) AS p,
            (SELECT "familyId" FROM "User" WHERE id = $2) AS c`,
    [parentId, child.id],
  );
  // Split: no longer the same family.
  expect(b.p === null || b.p !== b.c).toBe(true);
});

test("admins can merge into a parent-managed account by skipping the check", async ({
  browser,
}) => {
  const stamp = Date.now();
  const parentId = await createActiveMember(`Mgr Parent${stamp}`);
  const managedId = await createActiveMember(`Managed Kid${stamp}`);
  await sql(
    `UPDATE "User" SET "managedById" = $2, "primaryEmail" = NULL WHERE id = $1`,
    [managedId, parentId],
  );
  const own = await createActiveGraduate(`Own Kid${stamp}`, "2001-01-01");

  const admin = await browser.newPage();
  await signInWithEmail(admin, "admin@example.com");
  await admin.goto(`/en/app/admin/members/${managedId}#merge`);
  const section = admin.locator("#merge");
  await section.getByLabel("Other account (ID or email)").fill(own.email);
  await section.getByText("Keep this account", { exact: true }).click();
  await section.getByRole("button", { name: "Review merge" }).click();
  await section.getByRole("button", { name: "Merge accounts" }).click();
  // Stopped by the check, with the option to skip it.
  const bypass = section.getByRole("checkbox", {
    name: /Merge anyway \(skip this check\)/,
  });
  await expect(bypass).toBeVisible();
  await bypass.check();
  await section.getByRole("button", { name: "Merge accounts" }).click();
  await expect
    .poll(async () => {
      const [r] = await sql<{ email: string | null; managed: string | null }>(
        `SELECT "primaryEmail" AS email, "managedById" AS managed FROM "User" WHERE id = $1`,
        [managedId],
      );
      return r;
    })
    .toEqual({ email: own.email, managed: null });
});

test("admins edit a member's education and work", async ({ browser }) => {
  const stamp = Date.now();
  const m = await createActiveGraduate(`Hist Admin${stamp}`, "1995-01-01");
  const company = `Admin Added Co ${stamp}`;
  const admin = await browser.newPage();
  await signInWithEmail(admin, "admin@example.com");
  await admin.goto(`/en/app/admin/members/${m.id}#history`);
  const section = admin.locator("#history");
  await section.getByRole("button", { name: "Add a job" }).click();
  await section
    .getByRole("combobox", { name: "Company / organization" })
    .fill(company);
  await admin.getByRole("option", { name: `＋ Add “${company}”` }).click();
  await section.getByLabel("Start year").fill("2022");
  await section.getByRole("button", { name: "Add", exact: true }).click();
  await expect(section.getByText(company).first()).toBeVisible();

  // Saved on the member (not the admin), and their current status follows.
  await expect
    .poll(async () => {
      const [r] = await sql<{ stage: string | null; n: number }>(
        `SELECT (SELECT "currentStage"::text FROM "UserRole" WHERE "userId" = $1 AND role = 'FORMER_STUDENT') AS stage,
                (SELECT count(*)::int FROM "WorkEntry" WHERE "userId" = $1) AS n`,
        [m.id],
      );
      return r;
    })
    .toEqual({ stage: "WORKING", n: 1 });
  const [log] = await sql<{ n: number }>(
    `SELECT count(*)::int AS n FROM "AuditLog" WHERE action = 'member.history_added' AND "targetId" = $1`,
    [m.id],
  );
  expect(log.n).toBe(1);
});
