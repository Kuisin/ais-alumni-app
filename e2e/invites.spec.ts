import { expect, test } from "@playwright/test";
import { signInWithEmail, uniqueEmail } from "./helpers";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

test("invite a classmate: one-time link, pre-filled sign-up, shown to admins", async ({
  browser,
}) => {
  const lastName = `Invitee${Date.now() % 1_000_000}`;

  // Hanako invites a 第3期 graduate.
  const hanako = await browser.newPage();
  await signInWithEmail(hanako, "hanako@example.com");
  await hanako.goto("/en/app/invite");
  await hanako.getByText("Student / graduate", { exact: true }).click();
  await hanako
    .getByLabel("Their 学年 (class)")
    .selectOption({ label: "Class 3 (graduated 2014)" });
  await hanako.getByLabel("Their name (optional)").fill(lastName);
  await hanako.getByRole("button", { name: "Create invitation link" }).click();
  const link = await hanako.getByLabel("Invitation link").inputValue();
  expect(link).toMatch(
    /^https:\/\/ais\.kai-lab\.net\/api\/invite\/[\w-]+\?l=en$/,
  );
  const path = new URL(link).pathname + new URL(link).search;

  // The invitee opens the link: the sign-in page says who invited them.
  const ctx = await browser.newContext();
  const member = await ctx.newPage();
  await member.goto(path);
  await expect(member).toHaveURL(/\/en\/app\?invite=1/);
  await expect(
    member.getByText(
      /Suzuki, Hanako invited you \(Class 3 student \/ graduate\)/,
    ),
  ).toBeVisible();

  // Sign-up starts with what the inviter said.
  await signInWithEmail(member, uniqueEmail("invitee"));
  await member.getByRole("button", { name: "Skip for now" }).click();
  await expect(
    member.getByRole("checkbox", { name: /Student \/ Alumni/ }),
  ).toBeChecked();
  await member.getByRole("button", { name: "Next" }).click();
  await member
    .getByRole("textbox", { name: "Last name", exact: true })
    .fill(lastName);
  await member
    .getByRole("textbox", { name: "First name", exact: true })
    .fill("Invited");
  await member.getByLabel("Date of birth").fill("1996-05-05");
  await member.getByLabel("Gender").selectOption("OTHER");
  await member.getByRole("button", { name: "Next" }).click();
  await expect(member.getByRole("combobox", { name: /学年/ })).toHaveValue("3");
  await member.getByLabel("Year you joined AIS").fill("2008");
  await member.getByRole("button", { name: "Next" }).click();
  await member.getByLabel("Diploma file").setInputFiles({
    name: "diploma.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await expect(member.getByText("diploma.png")).toBeVisible();
  await member.getByRole("button", { name: "Submit application" }).click();
  await expect(member).toHaveURL(/\/en\/app\/onboarding\/status/);

  // The link works only once.
  const again = await (await browser.newContext()).newPage();
  await again.goto(path);
  await expect(again).toHaveURL(/invite=invalid/);

  // Hanako sees it used; the admin sees the invitation, matching.
  await hanako.reload();
  await expect(
    hanako.getByText(`${lastName}, Invited signed up`),
  ).toBeVisible();
  const admin = await browser.newPage();
  await signInWithEmail(admin, "admin@example.com");
  await admin.goto("/en/app/admin/verification");
  await admin.getByRole("searchbox", { name: "Search" }).fill(lastName);
  await admin.getByRole("button", { name: "Search" }).click();
  const row = admin.getByRole("link", { name: new RegExp(lastName) });
  await expect(row.getByText("Invited", { exact: true })).toBeVisible();
  await row.click();
  const panel = admin.getByRole("region", { name: "Invitation" });
  await expect(panel.getByText("Suzuki, Hanako")).toBeVisible();
  await expect(panel.getByText("Matches the application")).toBeVisible();
});
