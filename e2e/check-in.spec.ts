import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";
import ExcelJS from "exceljs";
import { signInWithEmail } from "./helpers";

/** Same ticket as src/lib/event-tickets.ts (the QR code's `t`). */
function ticket(eventId: string, userId: string): string {
  const sig = createHmac("sha256", process.env.AUTH_SECRET ?? "")
    .update(`event-ticket:${eventId}:${userId}`)
    .digest()
    .subarray(0, 16)
    .toString("base64url");
  return `${userId}.${sig}`;
}

test("staff scan a member's QR ticket to check them in", async ({
  browser,
}) => {
  test.skip(!process.env.AUTH_SECRET, "needs AUTH_SECRET from .env");
  const title = `Check-in ${Date.now()}`;
  const admin = await browser.newPage();
  await signInWithEmail(admin, "admin@example.com");
  await admin.goto("/en/app/admin/events/new");
  await admin.getByLabel("Title (Japanese)").fill(title);
  await admin.getByLabel(/^Start/).fill("2030-07-01T18:00");
  await admin.getByRole("button", { name: "Create event" }).click();
  await expect(admin.getByText("The event has been created.")).toBeVisible();
  const eventId = admin.url().match(/events\/([^/?]+)/)?.[1] ?? "";

  // Hanako answers Going and gets a ticket; she can't open the staff page.
  const hanako = await browser.newPage();
  await signInWithEmail(hanako, "hanako@example.com");
  await hanako.goto(`/en/app/events/${eventId}`);
  await hanako.getByText("Going", { exact: true }).click();
  await hanako.getByRole("button", { name: "Send RSVP" }).click();
  // After answering, the answer is shown with a button to change it.
  await expect(hanako.getByText(/^Your answer: Going/)).toBeVisible();
  await expect(
    hanako.getByRole("button", { name: "Change my answer" }),
  ).toBeVisible();
  await hanako.reload();
  const qr = hanako.getByRole("img", { name: /^Check-in QR code for/ });
  await expect(qr).toBeVisible();
  await expect(
    hanako.getByRole("link", { name: "Check-in (staff)" }),
  ).toHaveCount(0);
  await hanako.goto(`/en/app/events/${eventId}/check-in`);
  await expect(
    hanako.getByText("Only the event's staff can use this page."),
  ).toBeVisible();

  // The admin sees Hanako waiting, then scans (types) her ticket.
  await admin.goto(`/en/app/events/${eventId}/check-in`);
  const list = admin.getByRole("listitem").filter({ hasText: /Hanako/ });
  await expect(list.getByRole("button", { name: /^Check in/ })).toBeVisible();
  const userId = await hanakoIdFrom(hanako);
  await admin.getByPlaceholder("Enter code").fill(ticket(eventId, userId));
  await admin.getByRole("button", { name: "Check in", exact: true }).click();
  const banner = admin.getByRole("alert").filter({ hasText: /Hanako/ });
  await expect(banner.getByText("Checked in", { exact: true })).toBeVisible();
  await expect(list.getByText(/Checked in \d\d:\d\d/)).toBeVisible();

  // Scanning again says so; a forged or other-event code is refused.
  await admin.getByPlaceholder("Enter code").fill(ticket(eventId, userId));
  await admin.getByRole("button", { name: "Check in", exact: true }).click();
  await expect(banner.getByText(/^Already checked in/)).toBeVisible();
  await admin.getByPlaceholder("Enter code").fill(ticket("other", userId));
  await admin.getByRole("button", { name: "Check in", exact: true }).click();
  await expect(
    admin.getByRole("alert").getByText("This QR code isn't valid"),
  ).toBeVisible();

  // Opening the ticket link with a phone camera checks in too.
  await admin.goto(
    `/en/app/events/${eventId}/check-in?t=${encodeURIComponent(ticket(eventId, userId))}`,
  );
  await expect(banner.getByText(/^Already checked in/)).toBeVisible();

  // Hanako's ticket shows she's in.
  await hanako.goto(`/en/app/events/${eventId}`);
  await expect(hanako.getByText(/^Checked in \(/)).toBeVisible();

  // Admin makes Hanako staff; she then gets the reception screen.
  await admin.goto(`/en/app/admin/events/${eventId}`);
  await admin.getByPlaceholder("Add staff").fill("Hanako");
  await admin
    .getByRole("button", { name: /Hanako/ })
    .first()
    .click();
  await expect(
    admin.getByRole("button", { name: /^Remove .*Hanako.* from staff/ }),
  ).toBeVisible();
  await hanako.goto(`/en/app/events/${eventId}`);
  await hanako.getByRole("link", { name: "Check-in (staff)" }).click();
  await expect(hanako.getByRole("heading", { name: "Check-in" })).toBeVisible();

  // Undo from the list.
  hanako.once("dialog", (d) => d.accept());
  await hanako
    .getByRole("listitem")
    .filter({ hasText: /Hanako/ })
    .getByRole("button", { name: /^Undo/ })
    .click();
  await expect(
    hanako
      .getByRole("listitem")
      .filter({ hasText: /Hanako/ })
      .getByRole("button", { name: /^Check in/ }),
  ).toBeVisible();

  // Excel export: summary and attendee sheets with the check-in.
  await admin.goto(`/en/app/admin/events/${eventId}`);
  const [download] = await Promise.all([
    admin.waitForEvent("download"),
    admin.getByRole("link", { name: "Download Excel" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^event-2030-07-01-.+\.xlsx$/);
  const book = new ExcelJS.Workbook();
  await book.xlsx.readFile(await download.path());
  expect(book.worksheets.map((w) => w.name)).toEqual(["Summary", "Attendees"]);
  const sheet = book.getWorksheet("Attendees");
  const hanakoRow = sheet
    ?.getSheetValues()
    .find((r) => Array.isArray(r) && r.includes("Suzuki, Hanako")) as
    | unknown[]
    | undefined;
  expect(hanakoRow).toBeDefined();
  expect(hanakoRow).toContain("Going");
  // Checked in (undone above, so the check-in time is empty again).
  expect(sheet?.getRow(1).getCell(8).value).toBe("Checked in at");

  // Clean up.
  await admin.goto(`/en/app/admin/events/${eventId}`);
  await admin.getByRole("button", { name: "Edit", exact: true }).click();
  admin.once("dialog", (d) => d.accept());
  await admin.getByRole("button", { name: /Delete/ }).click();
  await expect(admin).toHaveURL(/\/en\/app\/admin\/events(\?|$)/);
});

async function hanakoIdFrom(page: import("@playwright/test").Page) {
  const res = await page.request.get("/api/auth/session");
  const body = (await res.json()) as { user?: { id?: string } };
  return body.user?.id ?? "";
}
