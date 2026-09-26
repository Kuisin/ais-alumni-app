import type { VercelConfig } from "@vercel/config/v1";

// Domains: ais.kai-lab.net → main (production), ais-dev.kai-lab.net → dev.
// Everything runs in Tokyo: functions (hnd1), Supabase Postgres
// (ap-northeast-1), Vercel Blob (hnd1) and Resend sending (ap-northeast-1).
// Cron schedules are UTC.
export const config: VercelConfig = {
  framework: "nextjs",
  // Generate explicitly: cached installs on Vercel skip the postinstall hook.
  buildCommand: "prisma generate && prisma migrate deploy && next build",
  regions: ["hnd1"],
  // Deploy only main (production, ais.kai-lab.net) and dev (ais-dev.kai-lab.net).
  // Other branches have no env vars; exit 0 tells Vercel to skip the build.
  ignoreCommand:
    'if [ "$VERCEL_GIT_COMMIT_REF" = "main" ] || [ "$VERCEL_GIT_COMMIT_REF" = "dev" ]; then exit 1; else exit 0; fi',
  crons: [
    // 09:00 JST daily: 7-day and 1-day event reminders (§10.3)
    { path: "/api/cron/reminders", schedule: "0 0 * * *" },
    // 09:00 JST on April 1: yearly "is your status still X?" prompt (§7)
    { path: "/api/cron/stage-prompt", schedule: "0 0 1 4 *" },
    // 03:00 JST daily: delete evidence 30 days after decision (§6.3)
    { path: "/api/cron/cleanup-evidence", schedule: "0 18 * * *" },
  ],
};
