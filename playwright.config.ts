import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], browserName: "chromium" },
    },
    {
      // Desktop layout (top nav, admin sidebar). Runs after mobile: both use
      // the same seeded accounts.
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 860 },
      },
      dependencies: ["mobile"],
    },
  ],
  webServer: {
    command: `pnpm next start -p ${PORT}`,
    env: {
      EMAIL_DEV_MAILBOX: "1",
      // Lets tests call /api/cron?task=… (e.g. sending reserved news).
      CRON_SECRET: "e2e-cron-secret",
      // Chat v2 (18歳以上, DMs) is off on dev/main until released.
      CHAT_V2: "1",
      CHAT_V3: "1",
      CHAT_V4: "1",
      // 同窓会委員 group chat (new enum value, off until released).
      CHAT_V5: "1",
      // App notifications go to .data/dev-push instead of Expo; development
      // tokens are accepted (e2e/mobile-push.spec.ts).
      EXPO_PUSH_OUTBOX: "1",
      APP_URL: `http://localhost:${PORT}`,
      AUTH_URL: `http://localhost:${PORT}`,
    },
    port: PORT,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
