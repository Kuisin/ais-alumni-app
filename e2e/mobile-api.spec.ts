import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
  clearMailbox,
  createActiveGraduate,
  readCode,
  uniqueEmail,
} from "./helpers";

// The native app's API (mobile/, src/app/api/mobile/v1): sign-in, the
// signed-in web view and what must be refused.
const API = "/api/mobile/v1";
const CHALLENGE = "a".repeat(43);

async function signIn(
  request: import("@playwright/test").APIRequestContext,
  email: string,
) {
  await clearMailbox(email);
  const sent = await request.post(`${API}/auth/email/request`, {
    data: { email, locale: "en" },
  });
  expect(await sent.json()).toEqual({ ok: true, notice: "sent" });
  const code = await readCode(email);
  const wrong = code === "000000" ? "111111" : "000000";
  const bad = await request.post(`${API}/auth/email/verify`, {
    data: { email, code: wrong, locale: "en" },
  });
  expect(bad.status()).toBe(400);
  expect((await bad.json()).error).toBe("invalid");
  const res = await request.post(`${API}/auth/email/verify`, {
    data: { email, code, locale: "en", device: { platform: "ios" } },
  });
  expect(res.ok()).toBe(true);
  return res.json();
}

test.describe("native app API", () => {
  test("email sign-in → me → web view → sign-out", async ({
    page,
    request,
  }) => {
    const { email } = await createActiveGraduate("Mobile Tester", "1990-04-01");
    const { token, me } = await signIn(request, email);
    expect(token).toMatch(/^aism_/);
    expect(me.user.state).toBe("ACTIVE");
    expect(me.onboardingPath).toBeNull();
    const auth = { Authorization: `Bearer ${token}` };
    expect((await request.get(`${API}/me`, { headers: auth })).ok()).toBe(true);

    // The web view's first request carries the token and gets a session.
    const handoff = await page.request.get(`${API}/web?next=/app/family`, {
      headers: auth,
      maxRedirects: 0,
    });
    expect(handoff.status()).toBe(303);
    const location = handoff.headers().location;
    expect(location).toMatch(/^\/(ja|en)\/app\/family$/);
    await page.goto(location);
    await expect(page).toHaveURL(/\/app\/family$/);
    // Inside the app: the website's own navigation and footer are left out.
    await expect(page.locator("main#main")).toBeVisible();
    await expect(page.locator("header")).toHaveCount(0);
    await expect(page.locator("footer")).toHaveCount(0);

    // The website cookie alone opens nothing in the app's API: pages on the
    // same site can't make the member's browser call it (CSRF).
    const forged = await page.request.post(`${API}/follows/requests/x/accept`, {
      headers: { "Content-Type": "text/plain" },
      data: "",
    });
    expect(forged.status()).toBe(401);
    expect(
      (
        await page.request.get(`${API}/web?next=/app/settings`, {
          maxRedirects: 0,
        })
      ).status(),
    ).toBe(401);

    // A crafted "finish" link can't turn that website session into a code
    // for someone else's app: only a sign-in the app itself started counts.
    const finish = await page.request.get(
      `${API}/auth/oauth/finish?challenge=${CHALLENGE}&redirect=aisalumni://auth`,
      { maxRedirects: 0 },
    );
    expect(finish.headers().location).toBe(
      "aisalumni://auth?error=signin_failed",
    );

    const out = await request.post(`${API}/auth/signout`, { headers: auth });
    expect(out.ok()).toBe(true);
    expect((await request.get(`${API}/me`, { headers: auth })).status()).toBe(
      401,
    );
    // The web view's website session ended with the device session.
    await page.goto(location);
    await expect(page).toHaveURL(/\/app\?next=/);
  });

  test("a Google / LINE sign-in code works once", async ({ page, request }) => {
    const { email } = await createActiveGraduate("Mobile Replay", "1990-05-01");
    const { token } = await signIn(request, email);
    // The browser's half of the flow: signed in on the website (as Auth.js
    // leaves it) with the cookie that .../oauth/start sets.
    await page.request.get(`${API}/web?next=/app/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
      maxRedirects: 0,
    });
    const verifier = `${"v".repeat(40)}-._~`;
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    await page.context().addCookies([
      {
        name: "ais_mobile_oauth",
        value: challenge,
        domain: "localhost",
        path: "/api/mobile/v1/auth/oauth",
      },
    ]);
    const finish = await page.request.get(
      `${API}/auth/oauth/finish?challenge=${challenge}&redirect=aisalumni://auth`,
      { maxRedirects: 0 },
    );
    const code = new URL(finish.headers().location).searchParams.get("code");
    expect(code).toBeTruthy();

    const first = await request.post(`${API}/auth/oauth/exchange`, {
      data: { code, verifier },
    });
    expect(first.ok()).toBe(true);
    const started = { Authorization: `Bearer ${(await first.json()).token}` };
    expect(
      (await request.get(`${API}/me`, { headers: started })).status(),
    ).toBe(200);
    const again = await request.post(`${API}/auth/oauth/exchange`, {
      data: { code, verifier },
    });
    expect(again.status()).toBe(400);
    // A reused code may have leaked: the session it started ends too.
    expect(
      (await request.get(`${API}/me`, { headers: started })).status(),
    ).toBe(401);
  });

  test("a new email account starts in onboarding", async ({ request }) => {
    const { me } = await signIn(request, uniqueEmail("e2e-mobile-new"));
    expect(me.user.state).toBe("EMAIL_VERIFIED");
    expect(me.user.locale).toBe("en");
    expect(me.onboardingPath).toBe("/app/onboarding/line");
  });

  test("refuses missing or unknown sessions and foreign redirects", async ({
    request,
  }) => {
    expect((await request.get(`${API}/me`)).status()).toBe(401);
    const bogus = { Authorization: "Bearer aism_not-a-session" };
    expect((await request.get(`${API}/me`, { headers: bogus })).status()).toBe(
      401,
    );
    expect(
      (
        await request.get(`${API}/web?next=/app/family`, { maxRedirects: 0 })
      ).status(),
    ).toBe(401);
    for (const redirect of [
      "https://evil.example/auth",
      "otherapp://auth",
      // Expo Go is for local development servers only.
      "exp://192.168.1.5:8081/--/auth",
    ])
      expect(
        (
          await request.get(
            `${API}/auth/oauth/start?provider=line&challenge=${CHALLENGE}&redirect=${encodeURIComponent(redirect)}`,
            { maxRedirects: 0 },
          )
        ).status(),
      ).toBe(400);
    const exchange = await request.post(`${API}/auth/oauth/exchange`, {
      data: { code: "forged.code", verifier: "v".repeat(43) },
    });
    expect(exchange.status()).toBe(400);
    expect((await exchange.json()).error).toBe("invalid_code");
  });
});
