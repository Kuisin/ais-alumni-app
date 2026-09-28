import { isAuthorizedCron } from "@/lib/cron";
import { dueScheduledNews, sendNewsNotification } from "@/lib/news";
import { sendDeadlineReminders } from "@/lib/news-hub-db";

export const maxDuration = 300;

/**
 * Reserved ニュース: notifies posts whose reserved time has come. Called every
 * 5 minutes by Supabase pg_cron (scripts/setup-supabase-cron.ts; the Vercel
 * Hobby plan only allows daily crons) and daily by the reminders cron as a
 * fallback. Safe to call often: each post is claimed once (notifiedAt).
 * Also sends the one reminder a day before a response deadline (remindedAt).
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request))
    return new Response("Unauthorized", { status: 401 });
  const now = new Date();
  let posts = 0;
  let recipients = 0;
  for (const post of await dueScheduledNews(now)) {
    try {
      const res = await sendNewsNotification(post.id, now);
      if (res) {
        posts++;
        recipients += res.recipients;
      }
    } catch (e) {
      console.error(`[cron/publish-news] ${post.id} failed`, e);
    }
  }
  let reminders = { posts: 0, recipients: 0 };
  try {
    reminders = await sendDeadlineReminders(now);
  } catch (e) {
    console.error("[cron/publish-news] reminders failed", e);
  }
  return Response.json({
    ok: true,
    ranAt: now.toISOString(),
    posts,
    recipients,
    reminders,
  });
}
