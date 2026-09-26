import type { VercelConfig } from "@vercel/config/v1";

// Production domain: ais.kai-lab.net (added in the Vercel dashboard).
// Everything runs in Tokyo: functions (hnd1), Supabase Postgres
// (ap-northeast-1), Vercel Blob (hnd1) and Resend sending (ap-northeast-1).
// Cron schedules are UTC.
export const config: VercelConfig = {
  framework: "nextjs",
  buildCommand: "prisma migrate deploy && next build",
  regions: ["hnd1"],
  crons: [
    // 09:00 JST daily: 7-day and 1-day event reminders (§10.3)
    { path: "/api/cron/reminders", schedule: "0 0 * * *" },
    // 09:00 JST on April 1: yearly "is your status still X?" prompt (§7)
    { path: "/api/cron/stage-prompt", schedule: "0 0 1 4 *" },
    // 03:00 JST daily: delete evidence 30 days after decision (§6.3)
    { path: "/api/cron/cleanup-evidence", schedule: "0 18 * * *" },
  ],
};
