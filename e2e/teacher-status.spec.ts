import { expect, test } from "@playwright/test";
import { Client } from "pg";
import { readCode, signInWithEmail, uniqueEmail } from "./helpers";

test("teacher with a leave year is registered as former automatically", async ({
  browser,
}) => {
  const email = uniqueEmail("teacher");
  const lastName = `Former${Date.now() % 1_000_000}`;
  const member = await browser.newPage();
  await signInWithEmail(member, email);
  await member.getByRole("button", { name: "Skip for now" }).click();

  await member.getByRole("checkbox", { name: /Teacher \/ Staff/ }).check();
  await member.getByRole("button", { name: "Next" }).click();
  await member
    .getByRole("textbox", { name: "Last name", exact: true })
    .fill(lastName);
  await member
    .getByRole("textbox", { name: "First name", exact: true })
    .fill("Teacher");
  await member.getByLabel("Date of birth").fill("1970-05-05");
  await member.getByLabel("Gender").selectOption("OTHER");
  await member.getByRole("button", { name: "Next" }).click();

  // Former/current comes from the leave year — no manual status.
  await member.getByLabel("Year you started").fill("2005");
  await member.getByLabel("Year you left").fill("2015");
  await expect(
    member.getByText("former teacher / staff (left in 2015)"),
  ).toBeVisible();
  await member.getByLabel("Subjects / grades taught").fill("Math");
  await member.getByRole("button", { name: "Next" }).click();
  await member.getByRole("button", { name: "Submit application" }).click();
  await expect(member).toHaveURL(/\/en\/app\/onboarding\/status/);

  const admin = await browser.newPage();
  await signInWithEmail(admin, "admin@example.com");
  await admin.goto(`/en/app/admin/members?q=${lastName}`);
  await expect(
    admin
      .getByText("Teacher / Staff（Former）")
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
});

test("current teachers must confirm a unique @aisnagoya.net school email", async ({
  browser,
}) => {
  const stamp = Date.now();
  const lastName = `Current${stamp % 1_000_000}`;
  const taken = `taken${stamp}@aisnagoya.net`;
  const mine = `mine${stamp}@aisnagoya.net`;
  // Someone else already has `taken`.
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const [other] = (
    await db.query(
      `SELECT id FROM "User" WHERE "primaryEmail" = 'ken@example.com'`,
    )
  ).rows;
  await db.query(
    `INSERT INTO "UserRole" (id, "userId", role, "schoolEmail") VALUES ($1, $2, 'TEACHER', $3)
     ON CONFLICT ("userId", role) DO UPDATE SET "schoolEmail" = EXCLUDED."schoolEmail"`,
    [`r${stamp}`, other.id, taken],
  );
  await db.end();

  const member = await browser.newPage();
  await signInWithEmail(member, uniqueEmail("teacher"));
  await member.getByRole("button", { name: "Skip for now" }).click();
  await member.getByRole("checkbox", { name: /Teacher \/ Staff/ }).check();
  await member.getByRole("button", { name: "Next" }).click();
  await member
    .getByRole("textbox", { name: "Last name", exact: true })
    .fill(lastName);
  await member
    .getByRole("textbox", { name: "First name", exact: true })
    .fill("Teacher");
  await member.getByLabel("Date of birth").fill("1980-05-05");
  await member.getByLabel("Gender").selectOption("OTHER");
  await member.getByRole("button", { name: "Next" }).click();
  await member.getByLabel("Year you started").fill("2018");
  await member.getByLabel("Subjects / grades taught").fill("Science");
  // Still working at AIS: the school email is required.
  await member.getByRole("button", { name: "Next" }).click();
  await expect(
    member.getByText("Current AIS staff need to give their school address"),
  ).toBeVisible();
  const field = member.getByLabel(/^School email/);
  await field.fill(taken);
  await member.getByRole("button", { name: "Send code" }).click();
  await expect(
    member.getByText("already registered to another member").first(),
  ).toBeVisible();
  await field.fill(mine);
  await member.getByRole("button", { name: "Send code" }).click();
  await member.getByLabel("6-digit code").fill(await readCode(mine));
  await member.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(
    member.getByText("Confirmed", { exact: true }).first(),
  ).toBeVisible();
  await member.getByRole("button", { name: "Next" }).click();
  await member.getByRole("button", { name: "Submit application" }).click();
  await expect(member).toHaveURL(/\/en\/app\/onboarding\/status/);

  const check = new Client({ connectionString: process.env.DATABASE_URL });
  await check.connect();
  const [role] = (
    await check.query(
      `SELECT r."schoolEmail" e, r."schoolEmailVerified" v FROM "UserRole" r JOIN "User" u ON u.id = r."userId"
       WHERE u."lastNameRomaji" = $1 AND r.role = 'TEACHER'`,
      [lastName],
    )
  ).rows;
  await check.query(
    `UPDATE "UserRole" SET "schoolEmail" = NULL WHERE "schoolEmail" = $1`,
    [taken],
  );
  await check.end();
  expect(role).toEqual({ e: mine, v: true });
});
