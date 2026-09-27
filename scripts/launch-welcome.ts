// Create the launch announcement (src/lib/launch-welcome.ts) as one draft
// ニュース post per member type, from the sender's account. Nothing reaches
// members until the sender opens each draft in 管理 → ニュース and uses
// 「公開して通知」. Dry run by default; --create writes. Safe to re-run: a
// type whose post already exists is skipped.
// Usage: DATABASE_URL=<db> pnpm news:launch-welcome --from <email> [--create]
import type { Prisma } from "@/generated/prisma/client";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { LAUNCH_TYPES, launchAudience, launchPost } from "@/lib/launch-welcome";
import { legacyColumns } from "@/lib/news-audience";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("--from")?.trim().toLowerCase();
  const create = process.argv.includes("--create");
  if (!email) throw new Error("Pass --from <sender email>.");
  const sender = await db.user.findUnique({
    where: { primaryEmail: email },
    select: {
      id: true,
      state: true,
      isAdmin: true,
      nameKanji: true,
      nameRomaji: true,
    },
  });
  if (!sender || sender.state !== "ACTIVE" || !sender.isAdmin)
    throw new Error(`No active admin with the email ${email}.`);

  for (const type of LAUNCH_TYPES) {
    const post = launchPost(type, sender);
    const audience = launchAudience(type);
    const existing = await db.newsPost.findFirst({
      where: { titleJa: post.titleJa },
      select: { id: true },
    });
    if (existing) {
      console.log(`${type}: already exists (${existing.id}) — skipped.`);
      continue;
    }
    if (!create) {
      console.log(
        `\n===== ${type} → ${audience.groups.join(", ")} =====\n` +
          `# ${post.titleJa}\n\n${post.bodyJa}\n\n# ${post.titleEn}\n\n${post.bodyEn}`,
      );
      continue;
    }
    const row = await db.newsPost.create({
      data: {
        ...post,
        publishedAt: null, // draft
        pinned: true,
        notifyOnPublish: true,
        allowComments: true,
        audience: audience as Prisma.InputJsonValue,
        ...legacyColumns(audience),
        createdById: sender.id,
      },
      select: { id: true },
    });
    await audit(
      sender.id,
      "news.create",
      { type: "NewsPost", id: row.id },
      {
        title: post.titleJa,
        delivery: "DRAFT",
        audience: audience as Prisma.InputJsonValue,
        via: "scripts/launch-welcome.ts",
      },
    );
    console.log(`${type}: draft created → /ja/app/admin/news/${row.id}`);
  }
  if (!create) console.log("\nDry run. Add --create to save these as drafts.");
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
