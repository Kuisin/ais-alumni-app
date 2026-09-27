import { expect, test } from "@playwright/test";
import { Client } from "pg";
import { createActiveGraduate, signInWithEmail } from "./helpers";

test("signing in returns to the page that was asked for", async ({ page }) => {
  const m = await createActiveGraduate(`Next Ret${Date.now()}`, "1990-02-02");
  await page.goto("/en/app/events?x=1");
  await expect(page).toHaveURL(/\/en\/app\?next=%2Fapp%2Fevents%3Fx%3D1$/);
  await signInWithEmail(page, m.email, page.url());
  await expect(page).toHaveURL(/\/en\/app\/events\?x=1$/);
});

test("photos: default icon for strangers; connections or everyone when public", async ({
  browser,
}) => {
  const stamp = Date.now();
  const owner = await createActiveGraduate(`Pic Owner${stamp}`, "1990-01-01");
  const friend = await createActiveGraduate(`Pic Friend${stamp}`, "1990-01-01");
  const stranger = await createActiveGraduate(`Pic Str${stamp}`, "1990-01-01");
  const photo = `https://example.com/p${stamp}.png`;
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  await db.query(
    `UPDATE "User" SET "avatarUrl" = $2, gender = 'FEMALE' WHERE id = $1`,
    [owner.id, photo],
  );
  // The owner follows the friend (accepted): connected either way.
  await db.query(
    `INSERT INTO "Follow" (id, "followerId", "followeeId", status) VALUES ($1, $2, $3, 'ACCEPTED')`,
    [`pf${stamp}`, owner.id, friend.id],
  );
  await db.end();

  const img = (p: import("@playwright/test").Page) =>
    p.locator("main img").first();

  const strangerPage = await browser.newPage();
  await signInWithEmail(strangerPage, stranger.email);
  await strangerPage.goto(`/en/app/members/${owner.id}`);
  await expect(img(strangerPage)).toHaveAttribute(
    "src",
    "/avatars/default-female.svg",
  );

  const friendPage = await browser.newPage();
  await signInWithEmail(friendPage, friend.email);
  await friendPage.goto(`/en/app/members/${owner.id}`);
  await expect(img(friendPage)).toHaveAttribute("src", photo);

  // The owner shows the photo to everyone.
  const ownerPage = await browser.newPage();
  await signInWithEmail(ownerPage, owner.email);
  await ownerPage.goto("/en/app/profile/edit");
  const settings = ownerPage.locator("#photo-settings");
  await settings.getByRole("button", { name: "Edit", exact: true }).click();
  await settings
    .getByRole("checkbox", { name: /^Show my photo to every member/ })
    .check();
  await settings.getByRole("button", { name: "Save", exact: true }).click();
  await expect(settings.getByText("Every member")).toBeVisible();

  await strangerPage.reload();
  await expect(img(strangerPage)).toHaveAttribute("src", photo);
});

test("gender is fixed: set once if missing, then changed by request", async ({
  browser,
}) => {
  const stamp = Date.now();
  const reason = `Chose the wrong one ${stamp}`;
  const m = await createActiveGraduate(`Gen Req${stamp}`, "1990-03-03");
  const page = await browser.newPage();
  await signInWithEmail(page, m.email);
  await page.goto("/en/app/profile/edit#gender");
  const card = page.locator("#gender");
  // Not given yet (joined before it was asked): set it once.
  await card.getByLabel(/^Gender/).selectOption("MALE");
  await card.getByRole("button", { name: "Save", exact: true }).click();
  await expect(card.getByText("Your gender has been saved.")).toBeVisible();
  await page.reload();
  await expect(card.getByText("Male", { exact: true })).toBeVisible();

  // Now only by request.
  await card.getByRole("button", { name: "Request a change" }).click();
  await card.getByLabel(/^Gender/).selectOption("FEMALE");
  await card.getByLabel(/^Reason for the change/).fill(reason);
  await card.getByRole("button", { name: "Send request" }).click();
  await expect(card.getByText(/The committee will check it/)).toBeVisible();

  const admin = await browser.newPage();
  await signInWithEmail(admin, "admin@example.com");
  await admin.goto("/en/app/admin/name-requests");
  const req = admin
    .locator("section", { has: admin.getByText("Gender changes") })
    .locator("div", { hasText: reason })
    .filter({ has: admin.getByRole("button", { name: "Approve and apply" }) })
    .last();
  await req.getByRole("button", { name: "Approve and apply" }).click();
  // Decided: it leaves the list of requests to review.
  await expect(admin.getByText(reason)).toHaveCount(0);

  await page.reload();
  await expect(card.getByText("Female", { exact: true })).toBeVisible();
});

test("members see their own language, whatever the URL (e.g. the PWA)", async ({
  page,
}) => {
  const m = await createActiveGraduate(`Lang Pwa${Date.now()}`, "1990-04-04");
  await signInWithEmail(page, m.email);
  // Saved language: English. A Japanese or locale-less URL follows it.
  await page.goto("/ja/app/events");
  await expect(page).toHaveURL(/\/en\/app\/events$/);
  await page.goto("/app/news");
  await expect(page).toHaveURL(/\/en\/app\/news$/);
});
