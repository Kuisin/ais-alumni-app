"use client";

import { useTranslations } from "next-intl";

/** 「読み込み中…」 for screen readers inside a loading region. */
export function LoadingLabel() {
  const t = useTranslations("common");
  return <span className="sr-only">{t("loading")}</span>;
}
