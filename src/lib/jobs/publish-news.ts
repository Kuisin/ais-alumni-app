import { dueScheduledNews, sendNewsNotification } from "@/lib/news";
import { sendDeadlineReminders } from "@/lib/news-hub-db";

/**
 * Reserved ニュース whose time has come, and the one reminder a day before
 * a response deadline. Safe to run often: each post is claimed once
 * (notifiedAt, remindedAt).
 */
export async function publishDueNews(now: Date) {
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
      console.error(`[jobs/publish-news] ${post.id} failed`, e);
    }
  }
  let reminders = { posts: 0, recipients: 0 };
  try {
    reminders = await sendDeadlineReminders(now);
  } catch (e) {
    console.error("[jobs/publish-news] reminders failed", e);
  }
  return { posts, recipients, reminders };
}
