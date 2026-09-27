// Install the Supabase Realtime channel policy (prisma/sql/realtime-policy.sql).
// Needs the realtime tables, which Supabase creates once Realtime is enabled.
// Usage: DATABASE_URL=<direct Supabase URL> pnpm realtime:setup
import { readFile } from "node:fs/promises";
import pg from "pg";

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL (or DIRECT_URL) to the Supabase database.");
  process.exit(1);
}
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  const { rows } = await client.query(
    "SELECT to_regclass('realtime.messages') AS t, to_regproc('realtime.topic') AS f",
  );
  if (!rows[0].t || !rows[0].f) {
    console.error(
      "realtime.messages / realtime.topic() not found. Enable Realtime in the Supabase dashboard (and open it once), then run this again.",
    );
    process.exit(2);
  }
  const sql = await readFile(
    new URL("../prisma/sql/realtime-policy.sql", import.meta.url),
    "utf8",
  );
  await client.query("BEGIN");
  await client.query(sql);
  await client.query("COMMIT");
  console.log("Realtime channel policy installed.");
} catch (e) {
  await client.query("ROLLBACK").catch(() => {});
  console.error(e);
  process.exit(1);
} finally {
  await client.end();
}
