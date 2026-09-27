import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { clearMailbox, signInWithEmail, uniqueEmail } from "./helpers";

const mail = (email: string) =>
  readFile(
    path.join(process.cwd(), ".data", "dev-mail", `${email}.txt`),
    "utf8",
  ).catch(() => "");

test("visitors send a support request; admins get it by email and close it", async ({
  page,
  browser,
}) => {
  const email = uniqueEmail("support");
  const subject = `Cannot sign in ${Date.now()}`;
  await clearMailbox("admin@example.com");

  // From the sign-in page: 不具合 › ログインできない is preselected.
  await page.goto("/en/app");
  await page.getByRole("link", { name: "Contact us" }).click();
  await expect(page.getByLabel(/^Type/)).toHaveValue("ISSUE");
  await expect(page.getByLabel(/^About/)).toHaveValue("SIGN_IN");

  // The second dropdown follows the first.
  await page.getByLabel(/^Type/).selectOption("FEATURE");
  await expect(page.getByLabel(/^About/)).toHaveValue("");
  await page.getByLabel(/^About/).selectOption({ label: "A new feature" });
  await page.getByLabel(/^Type/).selectOption("ISSUE");
  await page.getByLabel(/^About/).selectOption({ label: "Can't sign in" });

  // Errors keep what was typed.
  await page.getByLabel(/^Subject/).fill(subject);
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByText("Please check the form.")).toBeVisible();
  await expect(page.getByLabel(/^Subject/)).toHaveValue(subject);

  await page.getByLabel(/^Details/).fill("The LINE button shows an error.");
  await page.getByLabel(/^Your name/).fill("Support Visitor");
  await page.getByLabel(/^Email for our reply/).fill(email);
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sent" })).toBeVisible();

  // Admins get the whole request; the sender gets a copy.
  await expect.poll(() => mail("admin@example.com")).toContain(subject);
  const adminMail = await mail("admin@example.com");
  expect(adminMail).toContain("The LINE button shows an error.");
  expect(adminMail).toContain(email);
  expect(await mail(email)).toContain("The LINE button shows an error.");

  const admin = await browser.newPage();
  await signInWithEmail(admin, "admin@example.com");
  await admin.goto("/en/app/admin/support");
  const card = admin.locator("li").filter({ hasText: subject });
  await expect(card.getByText("Can't sign in")).toBeVisible();
  await expect(card.getByText("Not signed in")).toBeVisible();
  await card.getByRole("button", { name: "Mark as done" }).click();
  await expect(admin.locator("li").filter({ hasText: subject })).toHaveCount(0);
  await admin.goto("/en/app/admin/support?tab=closed");
  await expect(
    admin.locator("li").filter({ hasText: subject }).getByRole("button", {
      name: "Reopen",
    }),
  ).toBeVisible();
});

test("during sign-up, the help button sends the form with the current screen", async ({
  page,
}) => {
  const email = uniqueEmail("onb-help");
  const subject = `Stuck at LINE ${Date.now()}`;
  await clearMailbox("admin@example.com");
  await signInWithEmail(page, email);
  await expect(page).toHaveURL(/\/en\/app\/onboarding\/line/);

  await page.getByRole("button", { name: "Help", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Questions & errors" });
  await expect(dialog.getByLabel(/^Type/)).toHaveValue("QUESTION");
  await expect(dialog.getByLabel(/^About/)).toHaveValue("REGISTRATION");
  await expect(dialog.getByLabel(/^Email for our reply/)).toHaveValue(email);
  await dialog.getByLabel(/^Subject/).fill(subject);
  await dialog.getByLabel(/^Details/).fill("I don't use LINE. Can I skip it?");
  await dialog.getByLabel(/^Your name/).fill("New Applicant");
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  await expect(dialog.getByRole("heading", { name: "Sent" })).toBeVisible();
  await dialog
    .getByRole("button", { name: "Close", exact: true })
    .last()
    .click();
  await expect(dialog).toBeHidden();
  // Still on the same step.
  await expect(page).toHaveURL(/\/en\/app\/onboarding\/line/);

  await expect.poll(() => mail("admin@example.com")).toContain(subject);
  expect(await mail("admin@example.com")).toContain("/app/onboarding/line");
});
