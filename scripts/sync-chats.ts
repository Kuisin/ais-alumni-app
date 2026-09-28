// Put every active member in their group chats (and take everyone else
// out). Safe to run any time; the nightly status sync does the same.
// Usage: DATABASE_URL=<db> pnpm chat:sync
import { chatSyncUserIds, syncChatMembership } from "@/lib/chat-db";
import { db } from "@/lib/db";

async function main() {
  let changed = 0;
  for (const id of await chatSyncUserIds())
    if (await syncChatMembership(id)) changed++;
  const members = await db.chatMember.count();
  console.log(
    `Chat memberships updated for ${changed} member(s); ${members} membership(s) in total.`,
  );
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
