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
  ],
  webServer: {
    command: `pnpm next start -p ${PORT}`,
    env: {
      EMAIL_DEV_MAILBOX: "1",
      APP_URL: `http://localhost:${PORT}`,
      AUTH_URL: `http://localhost:${PORT}`,
    },
    port: PORT,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
