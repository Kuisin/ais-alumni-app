import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/card";
import { newsStatus } from "@/lib/news";

/** Draft / Scheduled / Published, Notified and Pinned badges for admin lists. */
export function NewsStatusBadges({
  post,
}: {
  post: { publishedAt: Date | null; notifiedAt: Date | null; pinned: boolean };
}) {
  const t = useTranslations("adminContent");
  const status = newsStatus(post);
  const tone =
    status === "published"
      ? "green"
      : status === "scheduled"
        ? "amber"
        : "slate";
  return (
    <>
      <Badge tone={tone}>{t(`news.status.${status}`)}</Badge>
      {post.notifiedAt ? (
        <Badge tone="brand">{t("news.status.notified")}</Badge>
      ) : null}
      {post.pinned ? (
        <Badge tone="brand">{t("news.status.pinned")}</Badge>
      ) : null}
    </>
  );
}
