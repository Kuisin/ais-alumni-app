import { expect, type Page, test } from "@playwright/test";
import { readLink, signInWithEmail, uniqueEmail } from "./helpers";

// A parent registers a (current-student) child; approving the child lets
// the parent in.
async function parentWithApprovedChild(
  browser: import("@playwright/test").Browser,
  lastName: string,
  childDob: string,
): Promise<{ parent: Page; admin: Page }> {
  const parent = await browser.newPage();
  await signInWithEmail(parent, uniqueEmail("parent"));
  await parent.getByRole("button", { name: "Skip for now" }).click();
  await parent.getByRole("checkbox", { name: /Parent/ }).check();
  await parent.getByRole("button", { name: "Next" }).click();
  await parent
    .getByRole("textbox", { name: "Last name", exact: true })
    .fill(lastName);
  await parent
    .getByRole("textbox", { name: "First name", exact: true })
    .fill("Parent");
  await parent.getByLabel("Date of birth").fill("1980-01-01");
  await parent.getByLabel("Gender").selectOption("OTHER");
  await parent.getByRole("button", { name: "Next" }).click();
  const romaji = parent.getByRole("group", { name: /Child’s name \(romaji\)/ });
  await romaji.getByRole("textbox", { name: /Last name/ }).fill(lastName);
  await romaji.getByRole("textbox", { name: /First name/ }).fill("Kid");
  await parent.getByLabel(/Child’s date of birth/).fill(childDob);
  await parent
    .getByRole("combobox", { name: /学年/ })
    .selectOption({ index: 1 });
  await parent.getByLabel(/Year your child joined AIS/).fill("2023");
  await parent.getByRole("button", { name: "Next" }).click();
  await parent.getByRole("button", { name: "Submit application" }).click();
  await expect(parent).toHaveURL(/\/en\/app\/onboarding\/status/);

  const admin = await browser.newPage();
  await signInWithEmail(admin, "admin@example.com");
  await admin.goto("/en/app/admin/verification");
  await admin.getByRole("searchbox", { name: "Search" }).fill(lastName);
  await admin.getByRole("button", { name: "Search" }).click();
  await admin
    .getByRole("link", { name: new RegExp(`${lastName}, Kid`) })
    .first()
    .click();
  await admin.getByRole("radio", { name: "Approve" }).check();
  await admin.getByRole("button", { name: "Approve" }).click();
  await expect(
    admin.getByText("This application has been decided."),
  ).toBeVisible();
  return { parent, admin };
}

test("parent hands the child account over; the child signs in to it", async ({
  browser,
}) => {
  const lastName = `Hand${Date.now() % 1_000_000}`;
  const { parent } = await parentWithApprovedChild(
    browser,
    lastName,
    "2019-03-03",
  );

  const childEmail = uniqueEmail("child");
  await parent.goto("/en/app/family");
  await parent.getByRole("button", { name: "Hand over to my child" }).click();
  await parent.getByLabel("Your child's email").fill(childEmail);
  await parent.getByRole("button", { name: "Send handover link" }).click();
  await expect(parent.getByText(/Handover link sent to/)).toBeVisible();

  // The child opens the emailed link and confirms (no sign-in needed).
  const link = await readLink(childEmail, "/app/handover/");
  const ctx = await browser.newContext();
  const child = await ctx.newPage();
  await child.goto(link);
  await child.getByRole("button", { name: "Take over my account" }).click();
  await expect(child.getByText("Handover complete.")).toBeVisible();

  // Signing in with that email opens the approved account directly.
  await signInWithEmail(child, childEmail);
  await expect(child).toHaveURL(/\/en\/app\/dashboard/);
  await expect(
    child.getByRole("heading", {
      level: 1,
      name: new RegExp(`${lastName}, Kid`),
    }),
  ).toBeVisible();

  // The link can't be used twice; the parent no longer manages the account.
  const again = await (await browser.newContext()).newPage();
  await again.goto(link);
  await expect(again.getByText(/invalid or has expired/)).toBeVisible();
  await parent.goto("/en/app/family");
  await expect(
    parent.getByRole("heading", { name: "Children you manage" }),
  ).toHaveCount(0);
});

test("a student signing up after a parent registered them is caught and merged", async ({
  browser,
}) => {
  const lastName = `Dup${Date.now() % 1_000_000}`;
  const { admin } = await parentWithApprovedChild(
    browser,
    lastName,
    "2018-04-04",
  );

  // The child signs up themselves with the same name and birth date.
  const kid = await browser.newPage();
  await signInWithEmail(kid, uniqueEmail("kid"));
  await kid.getByRole("button", { name: "Skip for now" }).click();
  await kid.getByRole("checkbox", { name: /Student \/ Alumni/ }).check();
  await kid.getByRole("button", { name: "Next" }).click();
  await kid
    .getByRole("textbox", { name: "Last name", exact: true })
    .fill(lastName);
  await kid
    .getByRole("textbox", { name: "First name", exact: true })
    .fill("Kid");
  await kid.getByLabel("Date of birth").fill("2018-04-04");
  await kid.getByLabel("Gender").selectOption("OTHER");
  await kid.getByRole("button", { name: "Next" }).click();
  await expect(
    kid.getByText("It looks like a parent has already registered you."),
  ).toBeVisible();
  await kid.getByRole("combobox", { name: /学年/ }).selectOption({ index: 1 });
  await kid.getByLabel("Year you joined AIS").fill("2023");
  await kid.getByRole("button", { name: "Next" }).click();
  await kid.getByRole("button", { name: "Submit application" }).click();
  await expect(kid).toHaveURL(/\/en\/app\/onboarding\/status/);

  // The committee sees the match and merges, keeping the child's account.
  await admin.goto("/en/app/admin/verification");
  await admin.getByRole("searchbox", { name: "Search" }).fill(lastName);
  await admin.getByRole("button", { name: "Search" }).click();
  await admin
    .getByRole("link", { name: new RegExp(`${lastName}, Kid`) })
    .first()
    .click();
  await expect(
    admin.getByRole("heading", {
      name: "A parent already registered this person",
    }),
  ).toBeVisible();
  await admin
    .getByRole("button", { name: "Merge into applicant's account" })
    .click();
  await expect(
    admin.getByRole("heading", {
      name: "A parent already registered this person",
    }),
  ).toHaveCount(0);
});
