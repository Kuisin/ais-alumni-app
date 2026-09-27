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
  await page.getByRole("radio", { name: /^Save as draft/ }).check();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("The post has been saved.")).toBeVisible();

  // Archive: listed under "Archived", then restore.
  const editUrl = page.url();
  await page.getByRole("button", { name: "Archive" }).click();
  await expect(page.getByText("Archived").first()).toBeVisible();
  await page.goto("/en/app/admin/news?archived=1");
  await expect(page.getByText(title)).toBeVisible();
  await page.goto("/en/app/admin/news");
  await expect(page.getByText(title)).toHaveCount(0);
  await page.goto(editUrl);
  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByRole("button", { name: "Archive" })).toBeVisible();

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /Delete/ }).click();
  await expect(page).toHaveURL(/\/en\/app\/admin\/news(\?|$)/);
  await expect(page.getByText(title)).toHaveCount(0);
});

test("admin schedules a news post for graduates", async ({ page }) => {
  const title = `E2E scheduled ${Date.now()}`;
  // About an hour from now, as a JST datetime-local value.
  const sendAt = new Date(Date.now() + 9 * 3600_000 + 3600_000)
    .toISOString()
    .slice(0, 16);
  await signInWithEmail(page, "admin@example.com");
  await page.goto("/en/app/admin/news/new");
  await page.getByLabel("Title (Japanese)").fill(title);
  await page.getByLabel("Body (Japanese)").fill("Scheduled body");
  await page
    .getByRole("radio", { name: /^Schedule for a date and time/ })
    .check();
  await page.getByLabel(/^Send at \(JST\)/).fill(sendAt);
  await expect(
    page.getByRole("checkbox", { name: /^Notify by LINE and email/ }),
  ).toBeChecked();
  await page.getByRole("radio", { name: /^Choose conditions/ }).check();
  await page.getByRole("checkbox", { name: /^Graduate/ }).check();
  await expect(page.getByText(/^Recipients: \d+ members?$/)).toBeVisible();
  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  await expect(page.getByText("The post has been saved.")).toBeVisible();

  // The list shows the reservation and the audience.
  const editUrl = page.url();
  await page.goto("/en/app/admin/news");
  const row = page.getByRole("listitem").filter({ hasText: title });
  await expect(row.getByText("Scheduled", { exact: true })).toBeVisible();
  await expect(row.getByText(/^Scheduled: /)).toBeVisible();
  await expect(row.getByText("Graduate", { exact: true })).toBeVisible();

  // Editing keeps the reservation selected.
  await page.goto(editUrl);
  await expect(
    page.getByRole("radio", { name: /^Schedule for a date and time/ }),
  ).toBeChecked();
  await expect(page.getByLabel(/^Send at \(JST\)/)).toHaveValue(sendAt);

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /Delete/ }).click();
  await expect(page).toHaveURL(/\/en\/app\/admin\/news(\?|$)/);
  await expect(page.getByText(title)).toHaveCount(0);
});

test("events can target 卒業生 and 元在校生 separately", async ({
  browser,
}) => {
  const stamp = Date.now();
  const admin = await browser.newPage();
  await signInWithEmail(admin, "admin@example.com");
  const create = async (title: string, audience: RegExp) => {
    await admin.goto("/en/app/admin/events/new");
    await admin.getByLabel("Title (Japanese)").fill(title);
    await admin.getByLabel(/^Start/).fill("2030-06-01T18:00");
    await admin.getByRole("checkbox", { name: audience }).check();
    await admin.getByRole("button", { name: "Create event" }).click();
    await expect(admin.getByText("The event has been created.")).toBeVisible();
    return admin.url();
  };
  const leftUrl = await create(`Left only ${stamp}`, /^Former student \(left/);
  const gradUrl = await create(`Graduates only ${stamp}`, /^Graduate/);

  // Hanako (seeded) graduated in 2016.
  const hanako = await browser.newPage();
  await signInWithEmail(hanako, "hanako@example.com");
  await hanako.goto("/en/app/events");
  await expect(hanako.getByText(`Graduates only ${stamp}`)).toBeVisible();
  await expect(hanako.getByText(`Left only ${stamp}`)).toHaveCount(0);

  // Clean up.
  for (const url of [leftUrl, gradUrl]) {
    await admin.goto(url);
    admin.once("dialog", (d) => d.accept());
    await admin.getByRole("button", { name: /Delete/ }).click();
    await expect(admin).toHaveURL(/\/en\/app\/admin\/events(\?|$)/);
  }
});
