import { expect, type Page, test } from "@playwright/test";
import { signInWithEmail } from "./helpers";

// The add forms are collapsed behind a "＋ Add a school / job" button.
async function openAdd(page: Page, title: string) {
  await page.getByRole("button", { name: title }).click();
  const form = page.getByRole("region", { name: title });
  await expect(form).toBeVisible();
  return form;
}

// Seeded demo members: ken and emma (not following each other), admin.
test("education & work history with shared school search", async ({
  browser,
}) => {
  const stamp = Date.now();
  const school = `Test University ${stamp}`;
  const company = `Secret Corp ${stamp}`;

  const ken = await browser.newPage();
  await signInWithEmail(ken, "ken@example.com");
  await ken.goto("/en/app/profile/history");

  // New school: not in the list → "Add" option; still attending (no end year).
  let add = await openAdd(ken, "Add a school");
  await add.getByLabel("Type").selectOption("UNIVERSITY");
  await add.getByRole("combobox", { name: "School" }).fill(school);
  await expect(
    ken.getByRole("option", { name: `＋ Add “${school}”` }),
  ).toBeVisible();
  await ken.getByRole("option", { name: `＋ Add “${school}”` }).click();
  await add.getByLabel("Start year").fill("2024");
  await add.getByRole("button", { name: "Add", exact: true }).click();
  // The new entry appears in the list.
  await expect(ken.locator("li", { hasText: school }).first()).toBeVisible();

  // Work defaults to "Followers only".
  add = await openAdd(ken, "Add a job");
  await add
    .getByRole("combobox", { name: "Company / organization" })
    .fill(company);
  // 業種: the detail list follows the chosen category.
  const detail = add.getByRole("combobox", { name: "Industry (detail)" });
  await expect(detail).toBeDisabled();
  await add
    .getByRole("combobox", { name: "Industry", exact: true })
    .selectOption({ label: "Software & telecommunications" });
  await detail.selectOption({ label: "Software" });
  // 職種 works the same way.
  await add
    .getByRole("combobox", { name: "Job type", exact: true })
    .selectOption({ label: "IT & web" });
  await add
    .getByRole("combobox", { name: "Job type (detail)" })
    .selectOption({ label: "Systems engineer" });
  await add.getByLabel("Start year").fill("2020");
  await add.getByLabel("End year").fill("2023");
  await add.getByRole("button", { name: "Add", exact: true }).click();
  await expect(ken.getByText(company).first()).toBeVisible();
  await expect(
    ken.getByText("Software & telecommunications › Software").first(),
  ).toBeVisible();
  await expect(
    ken.getByText("IT & web › Systems engineer").first(),
  ).toBeVisible();

  // /profile forwards to the member page (client-side once streaming).
  await ken.goto("/en/app/profile");
  await ken.waitForURL(/\/en\/app\/members\/[^/?#]+$/);
  const kenId = new URL(ken.url()).pathname.split("/").pop();
  // Ongoing university → current stage set automatically.
  await expect(ken.getByText("University / College").first()).toBeVisible();

  // Emma finds the existing school by typing part of it and picks it.
  const emma = await browser.newPage();
  await signInWithEmail(emma, "emma@example.com");
  await emma.goto("/en/app/profile/history");
  add = await openAdd(emma, "Add a school");
  await add.getByLabel("Type").selectOption("UNIVERSITY");
  await add
    .getByRole("combobox", { name: "School" })
    .fill(`university ${stamp}`);
  await emma.getByRole("option", { name: new RegExp(school) }).click();
  await expect(add.getByText("Picked from the list.")).toBeVisible();
  await add.getByRole("button", { name: "Add", exact: true }).click();
  await expect(emma.locator("li", { hasText: school }).first()).toBeVisible();

  // Follower-only job is hidden from emma.
  await emma.goto(`/en/app/members/${kenId}`);
  await expect(emma.getByText(school).first()).toBeVisible();
  await expect(emma.getByText(company)).toHaveCount(0);

  // One shared school with two members, manageable by admins.
  const admin = await browser.newPage();
  await signInWithEmail(admin, "admin@example.com");
  await admin.goto(`/en/app/admin/organizations?kind=school&q=${stamp}`);
  await expect(admin.getByText(school)).toBeVisible();
  await expect(admin.getByText("2 members")).toBeVisible();
});
