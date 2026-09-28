import { expect, type Page, test } from "@playwright/test";
import { Client } from "pg";
import { createActiveGraduate, signInWithEmail } from "./helpers";

async function sql(text: string, values: unknown[]) {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    return (await db.query(text, values)).rows;
  } finally {
    await db.end();
  }
}

/** Start an event from the member events list. */
async function newEvent(page: Page, title: string) {
  await page.goto("/en/app/events");
  await page.getByRole("link", { name: "New event" }).click();
  await expect(page).toHaveURL(/\/en\/app\/events\/new$/);
  await page.getByLabel("Title (Japanese)").fill(title);
  await page.getByLabel(/^Start/).fill("2030-06-01T18:00");
}

test("current teachers create events that always include current teachers", async ({
  browser,
}) => {
  const stamp = Date.now();
  const teacher = await createActiveGraduate(`Teach E${stamp}`, "1980-01-01");
  await sql(
    `INSERT INTO "UserRole" (id, "userId", role, "teacherStatus") VALUES ($1, $2, 'TEACHER', 'CURRENT')`,
    [`${teacher.id}t`, teacher.id],
  );
  const title = `E2E teacher event ${stamp}`;

  const page = await browser.newPage();
  await signInWithEmail(page, teacher.email);
  await newEvent(page, title);
  await expect(
    page.getByText("You're posting as Teachers & staff.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("radio", { name: /^Choose conditions/ }).check();
  await expect(
    page.getByRole("checkbox", { name: /^Current teachers & staff/ }),
  ).toBeDisabled();
  await page.getByRole("checkbox", { name: /^Graduate\b/ }).check();
  await page.getByRole("button", { name: "Create event" }).click();
  await expect(page.getByText("The event has been created.")).toBeVisible();

  const [row] = await sql(
    `SELECT audience, "senderRole" FROM "Event" WHERE "titleJa" = $1`,
    [title],
  );
  expect(row.senderRole).toBe("TEACHER");
  expect(row.audience.groups.sort()).toEqual(["GRADUATE", "TEACHER_CURRENT"]);

  // Admin mode lists only their own events; members see the role.
  await page.goto("/en/app/admin/events");
  await expect(page.getByText(title)).toBeVisible();
  await expect(page.getByText("E2E event", { exact: false })).toHaveCount(0);

  const reader = await createActiveGraduate(`Grad G${stamp}`, "1991-01-01");
  const r = await browser.newPage();
  await signInWithEmail(r, reader.email);
  await r.goto("/en/app/events");
  const card = r.getByRole("link", { name: new RegExp(title) });
  await expect(card.getByText("From: Teachers & staff")).toBeVisible();
  await expect(r.getByRole("link", { name: "New event" })).toHaveCount(0);
  await card.click();
  await expect(r).toHaveURL(/\/en\/app\/events\/[^/?]+$/);
  await expect(r.getByText("Organized by")).toBeVisible();
  await expect(r.getByText("Teachers & staff", { exact: true })).toBeVisible();
});

test("同窓会委員 events show once another 同窓会委員 approves", async ({
  browser,
}) => {
  const stamp = Date.now();
  const author = await createActiveGraduate(`Author E${stamp}`, "1990-01-01");
  const peer = await createActiveGraduate(`Peer E${stamp}`, "1990-02-02");
  const reader = await createActiveGraduate(`Reader E${stamp}`, "1990-03-03");
  for (const u of [author, peer])
    await sql(
      `INSERT INTO "UserPosition" (id, "userId", position) VALUES ($1, $2, 'ALUMNI_COMMITTEE')`,
      [`pos${u.id}`, u.id],
    );
  const title = `E2E committee event ${stamp}`;

  const a = await browser.newPage();
  await signInWithEmail(a, author.email);
  await newEvent(a, title);
  await a
    .getByRole("button", { name: "Save and request approval", exact: true })
    .click();
  await expect(a).toHaveURL(/\/en\/app\/admin\/events\/[^/?]+\?created=1/);
  await expect(a.getByText(/Waiting for another 同窓会委員/)).toBeVisible();
  const eventUrl = a.url().replace(/\?.*$/, "");
  const eventId = eventUrl.split("/").pop();

  // Hidden from members until approved.
  const r = await browser.newPage();
  await signInWithEmail(r, reader.email);
  await r.goto("/en/app/events");
  await expect(
    r.getByRole("heading", { name: "Events", exact: true }),
  ).toBeVisible();
  await expect(r.getByText(title)).toHaveCount(0);
  await r.goto(`/en/app/events/${eventId}`);
  await expect(r.getByText(title)).toHaveCount(0);

  const p = await browser.newPage();
  await signInWithEmail(p, peer.email);
  await p.goto("/en/app/admin/events");
  const row = p.getByRole("link", { name: new RegExp(title) });
  await expect(row.getByText("Awaiting approval")).toBeVisible();
  await row.click();
  await expect(
    p.getByRole("button", { name: "Edit", exact: true }),
  ).toHaveCount(0);
  await p.getByRole("button", { name: "Approve" }).click();
  await expect(p.getByText("Approved.", { exact: true })).toBeVisible();

  await r.goto("/en/app/events");
  const card = r.getByRole("link", { name: new RegExp(title) });
  await expect(card.getByText("From: Alumni committee member")).toBeVisible();
});
