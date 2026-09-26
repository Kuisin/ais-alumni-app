import { expect, test } from "@playwright/test";
import { signInWithEmail, uniqueEmail } from "./helpers";

// Requires a migrated database seeded with SEED_ADMIN_EMAIL=admin@example.com.
const ADMIN = "admin@example.com";

test.describe("landing & i18n", () => {
  test("redirects / to a locale and renders both languages", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/(ja|en)$/);
    await page.goto("/ja");
    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.goto("/en");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("members-only pages redirect signed-out visitors", async ({ page }) => {
    await page.goto("/en/app/directory");
    await expect(page).toHaveURL(/\/en\/app$/);
  });

  test("landing page links to sign-up in the app", async ({ page }) => {
    await page.goto("/ja");
    await page.getByRole("link", { name: "新規登録" }).first().click();
    await expect(page).toHaveURL(/\/ja\/app$/);
    await expect(page.getByRole("button", { name: /LINE/ })).toBeVisible();
  });
});

test.describe("OAuth providers", () => {
  test("Google button starts the Google OAuth flow", async ({ page }) => {
    await page.goto("/en/app");
    const [req] = await Promise.all([
      page.waitForRequest((r) =>
        r.url().startsWith("https://accounts.google.com/"),
      ),
      page.getByRole("button", { name: "Continue with Google" }).click(),
    ]);
    expect(req.url()).toContain("redirect_uri=");
  });

  test("LINE button starts LINE Login with the add-friend prompt", async ({
    page,
  }) => {
    await page.goto("/en/app");
    const [req] = await Promise.all([
      page.waitForRequest((r) => r.url().startsWith("https://access.line.me/")),
      page.getByRole("button", { name: "Continue with LINE" }).click(),
    ]);
    expect(req.url()).toContain("bot_prompt=aggressive");
    expect(req.url()).toMatch(/scope=profile(\+|%20)openid/);
  });
});

test("email sign-up → verification → admin approval → member dashboard", async ({
  browser,
}) => {
  const email = uniqueEmail("alumni");
  // Unique per run so leftovers from earlier runs can't be picked by mistake.
  const lastName = `Tester${Date.now() % 1_000_000}`;
  const member = await browser.newPage();

  // 1. Email OTP sign-up lands on the skippable LINE step.
  await signInWithEmail(member, email);
  await expect(member).toHaveURL(/\/en\/app\/onboarding\/line/);
  await member.getByRole("button", { name: "Skip for now" }).click();

  // 2. Verification form.
  await expect(member).toHaveURL(/\/en\/app\/onboarding\/verify/);
  await member
    .getByRole("textbox", { name: "Last name", exact: true })
    .fill(lastName);
  await member
    .getByRole("textbox", { name: "First name", exact: true })
    .fill("Smoke");
  await member.getByLabel("Date of birth").fill("1996-04-02");
  await member
    .getByRole("checkbox", { name: "Former student / Alumni" })
    .check();
  await member.getByRole("button", { name: "Next" }).click();
  // 学年: the 卒業済み / 在校中 toggle filters the list; 第5期 finished 6th grade in 2016.
  await member.getByText("Graduated", { exact: true }).click();
  await member
    .getByRole("combobox", { name: /学年/ })
    .selectOption({ label: "Class 5 (elementary 2010–2016)" });
  await member.getByLabel("From (year)").fill("2008");
  await member.getByLabel("To (year)").fill("2014");
  await member.getByLabel("Last division attended").selectOption("HIGH_SCHOOL");
  await member.getByLabel("Graduation / leaving year").fill("2014");
  await member.getByRole("radio", { name: "Yes, I graduated" }).check();
  await member.getByLabel("Classmate 1").fill("Hanako Suzuki");
  await member.getByLabel("What are you doing now?").selectOption("WORKING");
  await member.getByRole("button", { name: "Next" }).click();
  await member.getByRole("button", { name: "Submit" }).click();

  // 3. Pending review; member pages stay closed.
  await expect(member).toHaveURL(/\/en\/app\/onboarding\/status/);
  await member.goto("/en/app/directory");
  await expect(member).toHaveURL(/\/en\/app\/onboarding\/status/);

  // 4. Admin approves.
  const admin = await browser.newPage();
  await signInWithEmail(admin, ADMIN);
  await admin.goto("/en/app/admin/verification");
  await admin
    .getByRole("link", { name: new RegExp(`Smoke ${lastName}`) })
    .first()
    .click();
  await admin.getByRole("radio", { name: "Approve" }).check();
  await admin.getByRole("button", { name: "Approve" }).click();
  await expect(
    admin.getByText("This application has been decided."),
  ).toBeVisible();

  // 5. Member now reaches the dashboard and directory.
  await member.goto("/en/app/dashboard");
  await expect(member).toHaveURL(/\/en\/app\/dashboard/);
  await member.goto("/en/app/directory");
  await expect(member.getByText("Hanako Suzuki").first()).toBeVisible();
});
