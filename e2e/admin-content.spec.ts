import { expect, test } from "@playwright/test";
import { signInWithEmail } from "./helpers";

test("admin creates, edits and deletes an event", async ({ page }) => {
  const title = `E2E event ${Date.now()}`;
  await signInWithEmail(page, "admin@example.com");
  await page.goto("/en/app/admin/events/new");
  await page.getByLabel("Title (Japanese)").fill(title);
  await page.getByLabel(/^Start/).fill("2030-05-01T18:00");
  await page.getByRole("checkbox", { name: /Former student/ }).check();
  await page.getByRole("button", { name: "Create event" }).click();
  await expect(page.getByText("The event has been created.")).toBeVisible();

  // Edit: the save bar stays reachable at the bottom of the screen.
  await page.getByLabel("Title (Japanese)").fill(`${title} edited`);
  const save = page.getByRole("button", { name: "Save", exact: true });
  await expect(save).toBeInViewport();
  await save.click();
  await expect(page.getByLabel("Title (Japanese)")).toHaveValue(
    `${title} edited`,
  );

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /Delete/ }).click();
  await expect(page).toHaveURL(/\/en\/app\/admin\/events(\?|$)/);
  await expect(page.getByText(`${title} edited`)).toHaveCount(0);
});

test("admin saves and deletes a news draft", async ({ page }) => {
  const title = `E2E news ${Date.now()}`;
  await signInWithEmail(page, "admin@example.com");
  await page.goto("/en/app/admin/news/new");
  await page.getByLabel("Title (Japanese)").fill(title);
  await page.getByLabel("Body (Japanese)").fill("Draft body");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("The post has been saved.")).toBeVisible();

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /Delete/ }).click();
  await expect(page).toHaveURL(/\/en\/app\/admin\/news(\?|$)/);
  await expect(page.getByText(title)).toHaveCount(0);
});
