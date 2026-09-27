import { expect, type Page, test } from "@playwright/test";
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
  await page.getByRole("button", { name: "Next" }).click();
}

async function approve(admin: Page, lastName: string) {
  await admin.goto("/en/app/admin/verification");
  await admin.getByRole("searchbox", { name: "Search" }).fill(lastName);
  await admin.getByRole("button", { name: "Search" }).click();
  await admin
    .getByRole("link", { name: new RegExp(`${lastName}, Parent`) })
    .first()
    .click();
}

test("parent registers a new child; the committee approves the child's details", async ({
  browser,
}) => {
  const lastName = `Fam${Date.now() % 1_000_000}`;
  const parent = await browser.newPage();
  await startParentApplication(parent, lastName);

  // The child isn't registered: the parent enters the child's details.
  await expect(
    parent.getByRole("radio", { name: /Register my child/ }),
  ).toBeChecked(); // the default
  const romaji = parent.getByRole("group", { name: /Child’s name \(romaji\)/ });
  await romaji.getByRole("textbox", { name: /Last name/ }).fill(lastName);
  await romaji.getByRole("textbox", { name: /First name/ }).fill("Kid");
  await parent.getByLabel(/Child’s date of birth/).fill("2019-05-05");
  await parent
    .getByRole("combobox", { name: /学年/ })
    .selectOption({ index: 1 });
  await parent.getByLabel(/Year your child joined AIS/).fill("2023");
  await parent.getByRole("button", { name: "Next" }).click();
  await parent.getByRole("button", { name: "Submit application" }).click();
  await expect(parent).toHaveURL(/\/en\/app\/onboarding\/status/);

  // The committee reviews the child's details, not the parent's.
  const admin = await browser.newPage();
  await signInWithEmail(admin, "admin@example.com");
  await approve(admin, lastName);
  const children = admin.getByRole("heading", {
    name: "Children's AIS records",
  });
  await expect(children).toBeVisible();
  await expect(
    admin.getByText("Registered by this parent").first(),
  ).toBeVisible();
  await expect(admin.getByText("Confirmed on approval")).toBeVisible();
  await admin.getByRole("radio", { name: "Approve" }).check();
  await admin.getByRole("button", { name: "Approve" }).click();
  await expect(
    admin.getByText("This application has been decided."),
  ).toBeVisible();

  // Parent and child are both approved; the child is managed by the parent.
  await parent.goto("/en/app/family");
  await expect(
    parent.getByRole("heading", { name: "Children you manage" }),
  ).toBeVisible();
  await expect(parent.getByText("Approved", { exact: true })).toBeVisible();
  await expect(parent.getByText(`${lastName}, Kid`).first()).toBeVisible();
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

  // The admin sees an existing member waiting for the child's confirmation.
  const admin = await browser.newPage();
  await signInWithEmail(admin, "admin@example.com");
  await approve(admin, lastName);
  await expect(admin.getByText("Existing member").first()).toBeVisible();
  await expect(
    admin.getByText("Waiting for the child to confirm"),
  ).toBeVisible();

  // The child confirms from their family page.
  const kid = await browser.newPage();
  await signInWithEmail(kid, child.email);
  await kid.goto("/en/app/family");
  await kid
    .getByRole("button", { name: /Confirm/ })
    .first()
    .click();
  await expect(kid.getByRole("button", { name: /Confirm/ })).toHaveCount(0);
  await admin.reload();
  await expect(admin.getByText("Relationship confirmed")).toBeVisible();
});
