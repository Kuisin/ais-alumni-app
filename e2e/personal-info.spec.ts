import { expect, test } from "@playwright/test";
import { Client } from "pg";
import { createActiveGraduate, signInWithEmail } from "./helpers";

test("personal details: family sees all, followers only what's shared", async ({
  browser,
}) => {
  const stamp = Date.now();
  const owner = await createActiveGraduate(`Priv Owner${stamp}`, "1990-01-01");
  const fan = await createActiveGraduate(`Priv Fan${stamp}`, "1990-01-01");
  const kin = await createActiveGraduate(`Priv Kin${stamp}`, "1990-01-01");
  const phone = `090-${String(stamp).slice(-4)}-0000`;
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const familyId = `fam${stamp}`;
  await db.query(`INSERT INTO "Family" (id) VALUES ($1)`, [familyId]);
  await db.query(
    `UPDATE "User" SET phone = $2, "familyId" = $3 WHERE id = $1`,
    [owner.id, phone, familyId],
  );
  await db.query(`UPDATE "User" SET "familyId" = $2 WHERE id = $1`, [
    kin.id,
    familyId,
  ]);
  await db.query(
    `INSERT INTO "Follow" (id, "followerId", "followeeId", status) VALUES ($1, $2, $3, 'ACCEPTED')`,
    [`fol${stamp}`, fan.id, owner.id],
  );
  await db.end();

  // A follower sees nothing by default.
  const fanPage = await browser.newPage();
  await signInWithEmail(fanPage, fan.email);
  await fanPage.goto(`/en/app/members/${owner.id}`);
  await expect(
    fanPage.getByText(/personal information are visible to their family only/),
  ).toBeVisible();
  await expect(fanPage.getByText(phone)).toHaveCount(0);

  // Family sees everything.
  const kinPage = await browser.newPage();
  await signInWithEmail(kinPage, kin.email);
  await kinPage.goto(`/en/app/members/${owner.id}`);
  await expect(kinPage.getByRole("link", { name: phone })).toBeVisible();
  await expect(kinPage.getByRole("link", { name: owner.email })).toBeVisible();

  // The owner shares the phone number with followers.
  const ownerPage = await browser.newPage();
  await signInWithEmail(ownerPage, owner.email);
  await ownerPage.goto("/en/app/profile");
  const section = ownerPage.locator("#follower-fields");
  await section.getByRole("button", { name: "Edit", exact: true }).click();
  const phoneBox = section.getByRole("checkbox", { name: /^Phone/ });
  await expect(phoneBox).not.toBeChecked();
  await phoneBox.check();
  await section.getByRole("button", { name: "Save", exact: true }).click();
  await expect(section.getByRole("checkbox")).toHaveCount(0);

  // Now the follower sees the phone number, but not the email.
  await fanPage.reload();
  await expect(fanPage.getByRole("link", { name: phone })).toBeVisible();
  await expect(fanPage.getByText(owner.email)).toHaveCount(0);
  await expect(
    fanPage.getByText("Showing only what they share with followers."),
  ).toBeVisible();
});
