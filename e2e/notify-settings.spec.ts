import { expect, test } from "@playwright/test";
import { Client } from "pg";
import { createActiveGraduate, signInWithEmail } from "./helpers";

test("members choose which notifications they get (account always on)", async ({
  page,
}) => {
  const m = await createActiveGraduate(`Ntf N${Date.now()}`, "1990-06-06");
  await signInWithEmail(page, m.email);
  await page.goto("/en/app/settings#notifications");
  const section = page.locator("#notifications");
  await section.getByRole("button", { name: "Choose notifications" }).click();
  await expect(
    section.getByRole("checkbox", { name: /^Account & your requests/ }),
  ).toBeDisabled();
  await section.getByRole("checkbox", { name: /^News/ }).uncheck();
  await section.getByRole("checkbox", { name: /^Chat/ }).uncheck();
  await section.getByRole("button", { name: "Save", exact: true }).click();
  await expect(section.getByText("Saved", { exact: true })).toBeVisible();

  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const r = await db.query(`SELECT "notifyOff" FROM "User" WHERE id = $1`, [
    m.id,
  ]);
  await db.end();
  expect([...r.rows[0].notifyOff].sort()).toEqual(["chat", "news"]);
});
