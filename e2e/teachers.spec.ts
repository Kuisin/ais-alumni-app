import { expect, test } from "@playwright/test";
import { asListed, createActiveMember, signInWithEmail } from "./helpers";

// Seeded demo member ken (SEED_DEMO=1) acts as the registrar; the teacher is
// a throwaway member so seeded roles stay unchanged.
test("teacher registrar marks a member as a current teacher and back", async ({
  browser,
}) => {
  const first = `Teach${Date.now().toString(36)}`;
  const name = `${first} Tester`;
  await createActiveMember(name);

  const admin = await browser.newPage();
  await signInWithEmail(admin, "admin@example.com");
  await admin.goto("/en/app/admin/members?q=ken");
  await admin
    .getByRole("link", { name: /Tanaka, Ken/ })
    .first()
    .click();
  await expect(admin.getByRole("heading", { name: "Positions" })).toBeVisible();
  const registrar = admin
    .locator("div.rounded-lg", { hasText: "Teacher registrar" })
    .filter({ has: admin.getByRole("button") });
  const assign = registrar.getByRole("button", { name: "Assign" });
  if (await assign.isVisible()) {
    // View first: Assign opens the form, Assign again saves it.
    await assign.click();
    await assign.click();
    await expect(
      registrar.getByText("Assigned", { exact: true }),
    ).toBeVisible();
  }

  const ken = await browser.newPage();
  await signInWithEmail(ken, "ken@example.com");
  await ken.goto("/en/app/settings");
  await expect(ken.getByText("Add or remove current teachers")).toBeVisible();
  await ken.getByRole("link", { name: "Switch to admin mode" }).click();
  await expect(ken).toHaveURL(/\/en\/app\/admin\/teachers/);
  // Only the pages their role allows.
  const nav = ken.getByRole("navigation", { name: "Admin menu" });
  await expect(nav.getByRole("link", { name: "Teachers" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Verification" })).toHaveCount(0);
  await ken.goto("/en/app/admin/verification");
  await expect(ken).toHaveURL(/\/en\/app\/dashboard/);

  await ken.goto("/en/app/admin/teachers");
  await ken.getByLabel("Search", { exact: true }).fill(first);
  await ken.getByRole("button", { name: "Search" }).click();
  await ken
    .getByRole("region", { name: "Add a current teacher" })
    .getByRole("listitem")
    .filter({ hasText: asListed(name) })
    .getByRole("button", { name: "Make current" })
    .click();
  const row = ken
    .getByRole("region", { name: /Current teachers/ })
    .getByRole("listitem")
    .filter({ hasText: asListed(name) });
  await expect(row).toHaveCount(1);
  ken.once("dialog", (d) => d.accept());
  await row.getByRole("button", { name: "Move to former" }).click();
  await expect(row).toHaveCount(0);

  // Changes are audited.
  await admin.goto("/en/app/admin/audit");
  await expect(admin.getByText("teacher.unassigned").first()).toBeVisible();
});
