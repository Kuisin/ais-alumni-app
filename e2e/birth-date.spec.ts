import { expect, test } from "@playwright/test";
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

test("birth date: add a missing one or correct it via the committee", async ({
  browser,
}) => {
  const stamp = Date.now();
  // A graduate without a birth date on file (like an admin set up by hand).
  const grad = await createActiveGraduate(`Bd B${stamp}`, "1990-01-01");
  await sql(`UPDATE "User" SET "dateOfBirth" = NULL WHERE id = $1`, [grad.id]);

  const member = await browser.newPage();
  await signInWithEmail(member, grad.email);
  await member.goto("/en/app/profile");
  const card = member.locator("#birth-date");
  await expect(card.getByText("Not registered", { exact: true })).toBeVisible();
  await card.getByRole("button", { name: "Request to add" }).click();
  await card.getByLabel("Date of birth").fill("1994-06-06");
  await card.getByRole("button", { name: "Send request" }).click();
  await expect(
    card.getByText(/asked to change it to June 6, 1994/),
  ).toBeVisible();

  // The committee approves; the date is applied and 18歳以上 follows.
  const admin = await browser.newPage();
  await signInWithEmail(admin, "admin@example.com");
  await admin.goto("/en/app/admin/name-requests");
  const req = admin
    .locator("section", { has: admin.getByText("Date of birth changes") })
    .locator("div", { hasText: `B${stamp}, Bd` })
    .filter({ has: admin.getByRole("button", { name: "Approve and apply" }) })
    .last();
  await req.getByRole("button", { name: "Approve and apply" }).click();
  // Decided: it leaves the list of requests to review.
  await expect(admin.getByText(`B${stamp}, Bd`)).toHaveCount(0);
  const groups = await sql(
    `SELECT g.kind FROM "ChatMember" m JOIN "ChatGroup" g ON g.id = m."groupId"
     WHERE m."userId" = $1`,
    [grad.id],
  );
  expect(groups.map((g) => g.kind)).toContain("ADULTS");

  await member.goto("/en/app/profile");
  await expect(card.getByText("June 6, 1994", { exact: true })).toBeVisible();
  // Their own member page is the same profile.
  await member.goto(`/en/app/members/${grad.id}`);
  await expect(member).toHaveURL(/\/en\/app\/profile$/);

  // Correcting a recorded date needs a reason.
  await member.goto("/en/app/profile");
  await card.getByRole("button", { name: "Request a change" }).click();
  await card.getByLabel("Date of birth").fill("1994-06-07");
  await card.getByRole("button", { name: "Send request" }).click();
  await expect(card.getByText("Please give a reason.")).toBeVisible();
});
