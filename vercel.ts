import type { VercelConfig } from "@vercel/config/v1";

// Domains: ais.kai-lab.net → main (production), ais-dev.kai-lab.net → dev.
// Everything runs in Tokyo: functions (hnd1), Supabase Postgres
// (ap-northeast-1), Vercel Blob (hnd1) and Resend sending (ap-northeast-1).
// Recurring tasks don't use Vercel Cron (Hobby allows only daily crons):
// one Supabase pg_cron job calls /api/cron every minute — see src/lib/jobs
// and scripts/setup-supabase-cron.ts.
export const config: VercelConfig = {
  framework: "nextjs",
  // Generate explicitly: cached installs on Vercel skip the postinstall hook.
  // No `prisma migrate deploy`: the schema and its migrations belong to
  // Kuisin/ais-alumni-v2, whose build applies them (same database).
  buildCommand: "prisma generate && next build",
  regions: ["hnd1"],
  // Deploy only main (production, ais.kai-lab.net) and dev (ais-dev.kai-lab.net).
  // Other branches get no deployment at all — not even a cancelled one, which
  // would still count toward Hobby's 100 deployments a day. "**" (not "*")
  // so branch names with a slash (feat/…) match too; a branch deploys when
  // any matching rule is true.
  git: {
    deploymentEnabled: {
      "**": false,
      main: true,
      dev: true,
    },
  },
  // Belt and braces: other branches have no env vars; exit 0 skips the build.
  ignoreCommand:
    'if [ "$VERCEL_GIT_COMMIT_REF" = "main" ] || [ "$VERCEL_GIT_COMMIT_REF" = "dev" ]; then exit 1; else exit 0; fi',
};
