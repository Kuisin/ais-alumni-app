import { expect, test } from "@playwright/test";
import { signInWithEmail } from "./helpers";

const lang = /言語を切り替える|Switch language/;

test("language is changed in Settings, not the header", async ({ page }) => {
  // Visitors can still switch on public pages (footer), not in the header.
  await page.goto("/ja/app");
  await expect(
    page.getByRole("banner").getByRole("button", { name: lang }),
  ).toHaveCount(0);
  await page
    .getByRole("contentinfo")
    .getByRole("button", { name: lang })
    .click();
  await expect(page).toHaveURL(/\/en\/app/);

  // Members: no switch in the header; Settings → Language instead.
  await signInWithEmail(page, "ken@example.com");
  await page.goto("/ja/app/dashboard");
  await expect(
    page.getByRole("banner").getByRole("button", { name: lang }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("contentinfo").getByRole("button", { name: lang }),
  ).toHaveCount(0);
  await page.goto("/ja/app/settings#language");
  // The current setting is shown first; 編集 opens the choices.
  await expect(page.getByRole("radio", { name: /English/ })).toHaveCount(0);
  await page
    .locator("#language")
    .getByRole("button", { name: "編集", exact: true })
    .click();
  await page.getByRole("radio", { name: /English/ }).check();
  await page.getByRole("button", { name: "言語を保存" }).click();
  await expect(page).toHaveURL(/\/en\/app\/settings/);
  // Back to Japanese so other tests see the default.
  await page
    .locator("#language")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await page.getByRole("radio", { name: /日本語/ }).check();
  await page.getByRole("button", { name: "Save language" }).click();
  await expect(page).toHaveURL(/\/ja\/app\/settings/);
});
