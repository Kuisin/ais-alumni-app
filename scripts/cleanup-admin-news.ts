// One-off: remove read receipts, confirmations and poll answers that admins
// left on ニュース posts they aren't in the audience of (see
// src/lib/news-cleanup.ts). Dry run by default; add --apply to delete.
// Usage: DATABASE_URL=<db> pnpm news:cleanup-admin [--apply]
import { db } from "@/lib/db";
import { cleanupAdminNewsRecords } from "@/lib/news-cleanup";

async function main() {
  const apply = process.argv.includes("--apply");
  const r = await cleanupAdminNewsRecords(apply);
  console.log(
    `${apply ? "Deleted" : "Would delete (dry run)"}: ${r.reads} read(s), ${r.confirms} confirmation(s), ${r.votes} poll answer(s) from ${r.admins} admin(s).`,
  );
  if (!apply) console.log("Run again with --apply to delete.");
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
