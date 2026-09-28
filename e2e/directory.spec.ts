import { expect, test } from "@playwright/test";
import { Client } from "pg";
import {
  asListed,
  createActiveGraduate,
  createActiveMember,
  signInWithEmail,
} from "./helpers";

async function addRole(userId: string, role: string) {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  await db.query(
    `INSERT INTO "UserRole" (id, "userId", role) VALUES ($1, $2, $3::"RoleKey")`,
    [`${userId}${role.toLowerCase()}`, userId, role],
  );
  await db.end();
}

test("directory: former students by default; parents can leave it", async ({
  browser,
}) => {
  const stamp = Date.now();
  const grad = `Dir Grad${stamp}`;
  const parentOnly = `Dir Parent${stamp}`;
  const gradParent = `Dir GradParent${stamp}`;
  await createActiveGraduate(grad, "1990-01-01");
  await addRole(await createActiveMember(parentOnly), "FORMER_PARENT");
  const both = await createActiveGraduate(gradParent, "1970-01-01");
  await addRole(both.id, "FORMER_PARENT");
  const viewer = await createActiveGraduate(`Dir Viewer${stamp}`, "1990-01-01");

  const page = await browser.newPage();
  await signInWithEmail(page, viewer.email);
  const results = page.locator("[data-results]");

  // Default 区分: graduates + former students only.
  await page.goto(`/en/app/directory?q=${stamp}`);
  await expect(page.getByLabel("Role")).toHaveValue("FORMER_STUDENT");
  await expect(
    results.getByText(asListed(grad), { exact: true }),
  ).toBeVisible();
  await expect(
    results.getByText(asListed(gradParent), { exact: true }),
  ).toBeVisible();
  await expect(
    results.getByText(asListed(parentOnly), { exact: true }),
  ).toHaveCount(0);

  // "All roles" shows the parent too.
  await page.getByLabel("Role").selectOption({ label: "All roles" });
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/role=all/);
  await expect(
    results.getByText(asListed(parentOnly), { exact: true }),
  ).toBeVisible();

  // A parent turns off 「会員名簿に表示する」.
  const parentPage = await browser.newPage();
  await signInWithEmail(parentPage, both.email);
  await parentPage.goto("/en/app/profile");
  const section = parentPage.locator("#directory");
  await expect(
    section.getByText("You are listed in the member directory"),
  ).toBeVisible();
  await section.getByRole("button", { name: "Edit", exact: true }).click();
  await section
    .getByRole("checkbox", { name: /Show me in the member directory/ })
    .uncheck();
  await section.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    section.getByText("You are not listed in the member directory"),
  ).toBeVisible();

  // Now they're gone from the list, whatever the filter.
  await page.goto(`/en/app/directory?q=${stamp}&role=all`);
  await expect(
    results.getByText(asListed(parentOnly), { exact: true }),
  ).toBeVisible();
  await expect(
    results.getByText(asListed(gradParent), { exact: true }),
  ).toHaveCount(0);

  // A member without a parent role has no such setting.
  await page.goto("/en/app/profile");
  await expect(page.locator("#directory")).toHaveCount(0);
});
