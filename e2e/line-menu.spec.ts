import { expect, test } from "@playwright/test";
import { signInWithEmail } from "./helpers";

test("admins preview the LINE rich menu", async ({ page }) => {
  await signInWithEmail(page, "admin@example.com");
  await page.goto("/en/app/admin/line");
  await expect(page.getByRole("heading", { name: "LINE menu" })).toBeVisible();
  // No Messaging API credentials in tests: a warning, and previews.
  await expect(
    page.getByText("LINE Messaging API credentials are not set."),
  ).toBeVisible();
  for (const l of ["ja", "en"]) {
    const img = await page.request.get(`/api/line/richmenu/${l}`);
    expect(img.headers()["content-type"]).toContain("image/png");
    expect((await img.body()).length).toBeLessThan(1_000_000);
  }
});
