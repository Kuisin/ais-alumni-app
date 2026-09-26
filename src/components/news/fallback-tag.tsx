import { useTranslations } from "next-intl";

/** "(English only)" / "(Japanese only)" tag when content fell back to the other language (§12). */
export function FallbackTag({ fallback }: { fallback: "ja" | "en" | null }) {
  const t = useTranslations("common");
  if (!fallback) return null;
  return (
    <span className="ml-2 align-middle text-xs font-normal text-slate-500">
      {fallback === "en" ? t("englishOnly") : t("japaneseOnly")}
    </span>
  );
}
