import { expect, type Page, test } from "@playwright/test";
import { Client } from "pg";
import {
  asListed,
  createActiveGraduate,
  signInWithEmail,
  uniqueEmail,
} from "./helpers";

async function startParentApplication(page: Page, lastName: string) {
  await signInWithEmail(page, uniqueEmail("parent"));
  await page.getByRole("button", { name: "Skip for now" }).click();
  await page.getByRole("checkbox", { name: /Parent/ }).check();
  await page.getByRole("button", { name: "Next" }).click();
  await page
    .getByRole("textbox", { name: "Last name", exact: true })
    .fill(lastName);
  await page
    .getByRole("textbox", { name: "First name", exact: true })
    .fill("Parent");
  await page.getByLabel("Date of birth").fill("1980-01-01");
  await page.getByLabel("Gender").selectOption("OTHER");
  await page.getByRole("button", { name: "Next" }).click();
}

async function chatGroupsOf(nameRomaji: string): Promise<string[]> {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const r = await db.query(
      `SELECT g.kind FROM "ChatMember" m JOIN "ChatGroup" g ON g.id = m."groupId"
       JOIN "User" u ON u.id = m."userId" WHERE u."nameRomaji" = $1`,
      [nameRomaji],
    );
    return r.rows.map((x) => x.kind as string);
  } finally {
    await db.end();
  }
}

async function searchQueue(admin: Page, lastName: string) {
  await admin.goto("/en/app/admin/verification");
  await admin.getByRole("searchbox", { name: "Search" }).fill(lastName);
  await admin.getByRole("button", { name: "Search" }).click();
}

async function addNewChild(parent: Page, lastName: string) {
  await expect(
    parent.getByRole("radio", { name: /Register my child/ }),
  ).toBeChecked(); // the default
  const romaji = parent.getByRole("group", { name: /Child’s name \(romaji\)/ });
  await romaji.getByRole("textbox", { name: /Last name/ }).fill(lastName);
  await romaji.getByRole("textbox", { name: /First name/ }).fill("Kid");
  await parent.getByLabel(/Child’s date of birth/).fill("2019-05-05");
  await parent
    .getByRole("combobox", { name: /^Class/ })
    .selectOption({ index: 1 });
  // The class names by year help to check the 学年.
  const years = parent.getByRole("table", { name: /classes by year/ });
  await expect(years).toContainText("Jellyfish");
  await expect(years).toContainText("6th grade");
  await parent.getByLabel(/Year your child joined AIS/).fill("2023");
  await parent.getByRole("button", { name: "Next" }).click();
  await parent.getByRole("button", { name: "Submit application" }).click();
  await expect(parent).toHaveURL(/\/en\/app\/onboarding\/status/);
}

test("parent registers a new child; approving the child lets the parent in", async ({
  browser,
}) => {
  const lastName = `Fam${Date.now() % 1_000_000}`;
  const parent = await browser.newPage();
  await startParentApplication(parent, lastName);
  await addNewChild(parent, lastName);
  await expect(
    parent.getByRole("heading", { name: "Waiting for your child's approval" }),
  ).toBeVisible();
  await expect(
    parent.getByText("Being reviewed by the committee"),
  ).toBeVisible();

  // The committee reviews the child (a student), not the parent.
  const admin = await browser.newPage();
  await signInWithEmail(admin, "admin@example.com");
  await searchQueue(admin, lastName);
  await expect(
    admin.getByRole("link", { name: new RegExp(`^${lastName}, Parent`) }),
  ).toHaveCount(0);
  const kid = admin.getByRole("link", { name: new RegExp(`${lastName}, Kid`) });
  await expect(kid.getByText(/^Registered by parent: /)).toBeVisible();
  await kid.click();
  await admin.getByRole("radio", { name: "Approve" }).check();
  await admin.getByRole("button", { name: "Approve" }).click();
  await expect(
    admin.getByText("This application has been decided."),
  ).toBeVisible();

  // Approval puts the parent in their group chats straight away (checked in
  // the database, before any visit to the chat page).
  expect(await chatGroupsOf(`${lastName}, Parent`)).toContain(
    "CURRENT_PARENTS",
  );

  // The parent is in; the child is approved and managed by the parent.
  await parent.goto("/en/app/family");
  await expect(parent).toHaveURL(/\/en\/app\/family/);
  await expect(
    parent.getByRole("heading", { name: "Children you manage" }),
  ).toBeVisible();
  await expect(parent.getByText("Approved", { exact: true })).toBeVisible();
  await expect(parent.getByText(`${lastName}, Kid`).first()).toBeVisible();
});

test("a question about the child goes to the parent to answer", async ({
  browser,
}) => {
  const lastName = `Ask${Date.now() % 1_000_000}`;
  const parent = await browser.newPage();
  await startParentApplication(parent, lastName);
  await addNewChild(parent, lastName);

  const admin = await browser.newPage();
  await signInWithEmail(admin, "admin@example.com");
  await searchQueue(admin, lastName);
  await admin
    .getByRole("link", { name: new RegExp(`${lastName}, Kid`) })
    .click();
  await admin.getByRole("radio", { name: "Ask for more information" }).check();
  await admin
    .getByRole("textbox", { name: /Message to the applicant/ })
    .fill("Which class was your child in?");
  await admin.getByRole("button", { name: "Send request" }).click();
  await expect(
    admin.getByText("This application has been decided."),
  ).toBeVisible();

  // The parent answers by resubmitting; the child is back in the queue.
  await parent.goto("/en/app/dashboard");
  await expect(parent).toHaveURL(/\/en\/app\/onboarding\/verify/);
  await expect(
    parent.getByText("Which class was your child in?"),
  ).toBeVisible();
  const submit = parent.getByRole("button", { name: "Submit application" });
  for (let i = 0; i < 4 && !(await submit.isVisible()); i++)
    await parent.getByRole("button", { name: "Next" }).click();
  await submit.click();
  await expect(parent).toHaveURL(/\/en\/app\/onboarding\/status/);
  await searchQueue(admin, lastName);
  await expect(
    admin.getByRole("link", { name: new RegExp(`${lastName}, Kid`) }),
  ).toBeVisible();
});

test("parent links a child who is already registered; the child confirms", async ({
  browser,
}) => {
  const lastName = `Link${Date.now() % 1_000_000}`;
  const childName = `Grad ${lastName}`;
  const child = await createActiveGraduate(childName, "1999-09-09");
  const parent = await browser.newPage();
  await startParentApplication(parent, lastName);

  await parent.getByText("Already registered", { exact: true }).click();
  await expect(
    parent.getByRole("radio", { name: /Already registered/ }),
  ).toBeChecked();
  // Exact name + birth date only: a wrong date finds nobody.
  await parent.getByLabel(/Child’s full name/).fill(childName);
  await parent.getByLabel(/Child’s date of birth/).fill("1999-09-08");
  await parent.getByRole("button", { name: "Find" }).click();
  await expect(parent.getByText(/No registered member matches/)).toBeVisible();
  await parent.getByLabel(/Child’s date of birth/).fill("1999-09-09");
  await parent.getByRole("button", { name: "Find" }).click();
  await parent
    .getByRole("button", { name: new RegExp(asListed(childName)) })
    .click();
  await expect(parent.getByRole("button", { name: /Change/ })).toBeVisible();
  await parent.getByRole("button", { name: "Next" }).click();
  await parent.getByRole("button", { name: "Submit application" }).click();
  await expect(parent).toHaveURL(/\/en\/app\/onboarding\/status/);

  // Nothing for the committee: the parent waits for the child to confirm.
  await expect(
    parent.getByText("Waiting for your child to confirm"),
  ).toBeVisible();
  const admin = await browser.newPage();
  await signInWithEmail(admin, "admin@example.com");
  await searchQueue(admin, lastName);
  await expect(
    admin.getByRole("link", { name: new RegExp(`^${lastName}, Parent`) }),
  ).toHaveCount(0);

  // The child confirms from their family page.
  const kid = await browser.newPage();
  await signInWithEmail(kid, child.email);
  await kid.goto("/en/app/family");
  // Pages stream in after a loading skeleton: click once it has settled.
  const confirm = kid.getByRole("button", { name: /Confirm/ }).first();
  await expect(confirm).toBeVisible();
  await kid.waitForLoadState("networkidle");
  await confirm.click();
  await expect(kid.getByRole("button", { name: /Confirm/ })).toHaveCount(0);

  // The confirmation lets the parent in.
  await parent.goto("/en/app/dashboard");
  await expect(parent).toHaveURL(/\/en\/app\/dashboard/);
});
