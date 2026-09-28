import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LineUsageCard } from "@/components/admin/line-usage-card";
import { RichMenuInstall } from "@/components/admin/rich-menu-install";
import { Alert, Badge, Card, PageHeader } from "@/components/ui/card";
import {
  RICH_MENU_ITEMS,
  RICH_MENU_REPLIES,
  richMenuStatus,
} from "@/lib/line-richmenu";
import { richMenuLabels } from "@/lib/line-richmenu-image";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/admin/line">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "line.richMenu.admin" });
  return { title: t("title") };
}

/** LINE Official Account: the rich menu (tiles to app pages). */
export default async function AdminLinePage() {
  const t = await getTranslations("line.richMenu.admin");
  const [status, ja, en] = await Promise.all([
    richMenuStatus(),
    richMenuLabels("ja"),
    richMenuLabels("en"),
  ]);
  const installed = Boolean(status.installed.ja);
  const isDefault = installed && status.defaultId === status.installed.ja;

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("intro")} />
      {!status.configured ? (
        <Alert tone="warning">{t("errors.notConfigured")}</Alert>
      ) : null}
      <LineUsageCard />
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{t("status")}</h2>
          {installed ? (
            <Badge tone={isDefault ? "green" : "amber"}>
              {isDefault ? t("installed") : t("notDefault")}
            </Badge>
          ) : (
            <Badge tone="slate">{t("notInstalled")}</Badge>
          )}
        </div>
        <p className="text-sm text-slate-600">{t("how")}</p>
        {status.configured ? <RichMenuInstall installed={installed} /> : null}
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        {(
          [
            ["ja", ja],
            ["en", en],
          ] as const
        ).map(([locale, l]) => (
          <Card key={locale} className="space-y-3">
            <h2 className="text-lg font-semibold">
              {locale === "ja" ? t("previewJa") : t("previewEn")}
            </h2>
            {/* API route: plain <img>, generated on the fly. */}
            {/* biome-ignore lint/performance/noImgElement: generated PNG preview */}
            <img
              src={`/api/line/richmenu/${locale}`}
              alt={t("previewAlt")}
              width={1250}
              height={843}
              className="h-auto w-full rounded-lg border border-slate-200"
            />
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-700 sm:grid-cols-3">
              {RICH_MENU_REPLIES.map((i) => (
                <li key={i.key}>
                  {l.labels[i.key]}{" "}
                  <span className="text-xs text-slate-500">
                    {t("replyNote")}
                  </span>
                </li>
              ))}
              {RICH_MENU_ITEMS.map((i) => (
                <li key={i.key}>
                  {l.labels[i.key]}{" "}
                  <span className="font-mono text-xs text-slate-500">
                    /{locale}
                    {i.path}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
