import { useTranslations } from "next-intl";

/** "未読" marker: a dot plus the word, so it doesn't rely on colour alone. */
export function UnreadBadge() {
  const t = useTranslations("news");
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-800">
      <span aria-hidden="true" className="size-2 rounded-full bg-red-600" />
      {t("unread")}
    </span>
  );
}
