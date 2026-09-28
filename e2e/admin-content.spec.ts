import { expect, test } from "@playwright/test";
import { signInWithEmail } from "./helpers";

test("admin creates, edits and deletes an event", async ({ page }) => {
  const title = `E2E event ${Date.now()}`;
  await signInWithEmail(page, "admin@example.com");
  await page.goto("/en/app/admin/events/new");
  await page.getByLabel("Title (Japanese)").fill(title);
  await page.getByLabel(/^Start/).fill("2030-05-01T18:00");
  await page.getByRole("radio", { name: /^Choose conditions/ }).check();
  await page
    .getByRole("checkbox", { name: /^Graduates \+ former students/ })
    .check();
  await page.getByRole("button", { name: "Create event" }).click();
  await expect(page.getByText("The event has been created.")).toBeVisible();

  // Saved data opens read-only; Edit opens the form. The save bar stays
  // reachable at the bottom of the screen, and saving returns to the view.
  await expect(page.getByLabel("Title (Japanese)")).toHaveCount(0);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Title (Japanese)").fill(`${title} edited`);
  const save = page.getByRole("button", { name: "Save", exact: true });
  await expect(save).toBeInViewport();
  await save.click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Title (Japanese)")).toHaveCount(0);
  await expect(page.getByText(`${title} edited`).first()).toBeVisible();

  // Closing RSVPs early (asks first; reopening doesn't).
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Close RSVPs" }).click();
  await expect(
    page.getByRole("button", { name: "Reopen RSVPs" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reopen RSVPs" }).click();
  await expect(page.getByRole("button", { name: "Close RSVPs" })).toBeVisible();

  await page.getByRole("button", { name: "Edit", exact: true }).click();

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /Delete/ }).click();
  await expect(page).toHaveURL(/\/en\/app\/admin\/events(\?|$)/);
  await expect(page.getByText(`${title} edited`)).toHaveCount(0);
});

test("admin saves and deletes a news draft", async ({ page }) => {
  const title = `E2E news ${Date.now()}`;
  await signInWithEmail(page, "admin@example.com");
  // Admins start a post from the member news list.
  await page.goto("/en/app/news");
  await page.getByRole("link", { name: "New post" }).click();
  await expect(page).toHaveURL(/\/en\/app\/news\/new$/);
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

  await page.getByRole("button", { name: "Edit", exact: true }).click();

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
  await page.goto("/en/app/news/new");
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
  await page.getByRole("checkbox", { name: /^Graduate(?!s)/ }).check();
  await expect(page.getByText(/^Recipients: [\d,]+ members?$/)).toBeVisible();
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
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: /^Schedule for a date and time/ }),
  ).toBeChecked();
  await expect(page.getByLabel(/^Send at \(JST\)/)).toHaveValue(sendAt);

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /Delete/ }).click();
  await expect(page).toHaveURL(/\/en\/app\/admin\/news(\?|$)/);
  await expect(page.getByText(title)).toHaveCount(0);
});

test("events use the ニュース audience conditions", async ({ browser }) => {
  const stamp = Date.now();
  const admin = await browser.newPage();
  await signInWithEmail(admin, "admin@example.com");
  const create = async (title: string, audience: RegExp) => {
    await admin.goto("/en/app/admin/events/new");
    await admin.getByLabel("Title (Japanese)").fill(title);
    await admin.getByLabel(/^Start/).fill("2030-06-01T18:00");
    await admin.getByRole("radio", { name: /^Choose conditions/ }).check();
    await admin.getByRole("checkbox", { name: audience }).check();
    await admin.getByRole("button", { name: "Create event" }).click();
    await expect(admin.getByText("The event has been created.")).toBeVisible();
    return admin.url();
  };
  const teacherUrl = await create(
    `Teachers only ${stamp}`,
    /^Current teachers/,
  );
  const gradUrl = await create(`Graduates only ${stamp}`, /^Graduate(?!s)/);

  // Hanako (seeded) graduated in 2016.
  const hanako = await browser.newPage();
  await signInWithEmail(hanako, "hanako@example.com");
  await hanako.goto("/en/app/events");
  await expect(hanako.getByText(`Graduates only ${stamp}`)).toBeVisible();
  await expect(hanako.getByText(`Teachers only ${stamp}`)).toHaveCount(0);

  // Clean up.
  for (const url of [teacherUrl, gradUrl]) {
    await admin.goto(url);
    await admin.getByRole("button", { name: "Edit", exact: true }).click();
    admin.once("dialog", (d) => d.accept());
    await admin.getByRole("button", { name: /Delete/ }).click();
    await expect(admin).toHaveURL(/\/en\/app\/admin\/events(\?|$)/);
  }
});
