// The one Supabase pg_cron job: calls GET /api/cron every minute, which runs
// every recurring task that is due (src/lib/jobs; Vercel Hobby only allows
// daily crons, and GitHub Actions schedules ran hours late). pg_net makes
// the request; CRON_SECRET is kept in Supabase Vault, so it's never in a
// migration or the repo. Safe to re-run: it updates the secret, replaces the
// job and removes the per-task jobs it replaced. --remove unschedules it.
// Not a Prisma migration: pg_cron / pg_net only exist on Supabase.
// Usage: DIRECT_URL=<prod direct url> CRON_SECRET=<prod secret> \
//   pnpm cron:setup [--url https://ais.kai-lab.net] [--remove]
import { Client } from "pg";

const JOB = "app-cron";
const SCHEDULE = "* * * * *";
/** Jobs from before there was one endpoint. */
const LEGACY_JOBS = ["publish-news", "line-menus"];
const SECRET_NAME = "cron_secret";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const url = process.env.DIRECT_URL;
  const secret = process.env.CRON_SECRET;
  const base = (arg("--url") ?? "https://ais.kai-lab.net").replace(/\/$/, "");
  if (!url) throw new Error("Set DIRECT_URL (the Supabase direct URL).");
  const db = new Client({ connectionString: url });
  await db.connect();
  try {
    const unschedule = async (name: string) => {
      const r = await db.query(
        "select cron.unschedule($1) where exists (select 1 from cron.job where jobname = $1)",
        [name],
      );
      if (r.rowCount) console.log(`Removed the ${name} job.`);
    };
    if (process.argv.includes("--remove")) {
      await unschedule(JOB);
      return;
    }
    if (!secret) throw new Error("Set CRON_SECRET (same as on Vercel).");
    await db.query(
      "create extension if not exists pg_cron with schema pg_catalog",
    );
    await db.query(
      "create extension if not exists pg_net with schema extensions",
    );

    // The secret lives in Vault; the job reads it at run time.
    const existing = await db.query<{ id: string }>(
      "select id from vault.secrets where name = $1",
      [SECRET_NAME],
    );
    if (existing.rows[0]) {
      await db.query("select vault.update_secret($1, $2)", [
        existing.rows[0].id,
        secret,
      ]);
    } else {
      await db.query("select vault.create_secret($1, $2, $3)", [
        secret,
        SECRET_NAME,
        "CRON_SECRET for the app's /api/cron/* endpoints",
      ]);
    }

    const endpoint = `${base}/api/cron`;
    const command = `select net.http_get(
      url := ${literal(endpoint)},
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = ${literal(SECRET_NAME)})
      ),
      timeout_milliseconds := 300000
    )`;
    // Scheduling under an existing name replaces that job.
    await db.query("select cron.schedule($1, $2, $3)", [
      JOB,
      SCHEDULE,
      command,
    ]);
    console.log(`Scheduled ${JOB} (${SCHEDULE}) → ${endpoint}`);
    for (const name of LEGACY_JOBS) await unschedule(name);
  } finally {
    await db.end();
  }
}

/** A SQL string literal (the URL and secret name are ours, not user input). */
function literal(s: string): string {
  return `'${s.replaceAll("'", "''")}'`;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
