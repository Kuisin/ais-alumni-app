// Post the launch announcement (src/lib/launch-welcome.ts) as the first
// message in each member-type group chat, under the sender's own account.
// Dry run by default; --send writes. Safe to re-run: a group that already
// has the message is skipped. If a group already has messages, the
// announcement is dated just before the oldest one so it stays first.
// Usage: DATABASE_URL=<db> pnpm chat:launch-welcome --from <email> [--send]
import { ChatGroupKind } from "@/generated/prisma/enums";
import { groupKey } from "@/lib/chat";
import { db } from "@/lib/db";
import {
  LAUNCH_KINDS,
  LAUNCH_TITLE_JA,
  launchMessage,
} from "@/lib/launch-welcome";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("--from")?.trim().toLowerCase();
  const send = process.argv.includes("--send");
  if (!email) throw new Error("Pass --from <sender email>.");
  const sender = await db.user.findUnique({
    where: { primaryEmail: email },
    select: { id: true, state: true, nameKanji: true, nameRomaji: true },
  });
  if (!sender || sender.state !== "ACTIVE")
    throw new Error(`No active member with the email ${email}.`);

  for (const kind of LAUNCH_KINDS) {
    const key = groupKey(ChatGroupKind[kind]);
    const group = await db.chatGroup.findUnique({
      where: { key },
      select: {
        id: true,
        _count: { select: { members: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    });
    const already = group
      ? await db.chatMessage.count({
          where: {
            groupId: group.id,
            userId: sender.id,
            body: { startsWith: LAUNCH_TITLE_JA },
            deletedAt: null,
          },
        })
      : 0;
    const members = group?._count.members ?? 0;
    if (already) {
      console.log(`${kind}: already posted — skipped.`);
      continue;
    }
    const body = launchMessage(kind, sender);
    if (!send) {
      console.log(`\n===== ${kind} (${members} member(s)) =====\n${body}`);
      continue;
    }
    const target =
      group ??
      (await db.chatGroup.create({
        data: { key, kind: ChatGroupKind[kind] },
        select: { id: true },
      }));
    const oldest = group?.messages[0]?.createdAt;
    const now = new Date();
    const createdAt =
      oldest && oldest <= now ? new Date(oldest.getTime() - 1000) : now;
    await db.chatMessage.create({
      data: { groupId: target.id, userId: sender.id, body, createdAt },
    });
    console.log(`${kind}: posted to ${members} member(s).`);
  }
  if (!send) console.log("\nDry run. Add --send to post these messages.");
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
