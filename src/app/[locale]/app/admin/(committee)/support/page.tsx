import { Mail, UserRound } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { setSupportClosedAction } from "@/app/actions/support";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { Tabs } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { asLocale } from "@/lib/events";
import { displayName, formatDateTime } from "@/lib/format";
import { supportRef } from "@/lib/support";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/admin/support">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "support" });
  return { title: t("admin.title") };
}

const TONE = {
  ISSUE: "red",
  QUESTION: "brand",
  COMPLAINT: "amber",
  FEATURE: "green",
} as const;

/** お問い合わせ inbox: open requests first; reply by email, then close. */
export default async function AdminSupportPage({
  params,
  searchParams,
}: PageProps<"/[locale]/app/admin/support">) {
  const { locale: rawLocale } = await params;
  const locale = asLocale(rawLocale);
  const tab = (await searchParams).tab === "closed" ? "closed" : "open";
  const t = await getTranslations("support");
  const where =
    tab === "open" ? { closedAt: null } : { closedAt: { not: null } };
  const [rows, openCount, closedCount] = await Promise.all([
    db.supportRequest.findMany({
      where,
      orderBy: { createdAt: tab === "open" ? "asc" : "desc" },
      take: 200,
      include: {
        user: { select: { id: true, nameRomaji: true, nameKanji: true } },
      },
    }),
    db.supportRequest.count({ where: { closedAt: null } }),
    db.supportRequest.count({ where: { closedAt: { not: null } } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("admin.title")} description={t("admin.intro")} />
      <Tabs
        label={t("admin.title")}
        items={[
          {
            href: "/app/admin/support",
            label: t("admin.open"),
            count: openCount,
            active: tab === "open",
          },
          {
            href: "/app/admin/support?tab=closed",
            label: t("admin.closed"),
            count: closedCount,
            active: tab === "closed",
          },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState icon={<Mail />}>
          {tab === "open" ? t("admin.emptyOpen") : t("admin.emptyClosed")}
        </EmptyState>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => {
            const type = r.type as keyof typeof TONE;
            const reply = `mailto:${r.email}?subject=${encodeURIComponent(`Re: ${r.subject} [${supportRef(r.id)}]`)}`;
            return (
              <li key={r.id} id={r.id} className="scroll-mt-24">
                <Card className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={TONE[type] ?? "slate"}>
                      {t(`types.${r.type}.label`)}
                    </Badge>
                    <span className="text-sm text-slate-700">
                      {t(`types.${r.type}.topics.${r.topic}`)}
                    </span>
                    <span className="ml-auto text-xs text-slate-500 tabular-nums">
                      #{supportRef(r.id)} ·{" "}
                      <time dateTime={r.createdAt.toISOString()}>
                        {formatDateTime(r.createdAt, locale)}
                      </time>
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold break-words">
                    {r.subject}
                  </h2>
                  <p className="text-sm leading-relaxed break-words whitespace-pre-line text-slate-800">
                    {r.message}
                  </p>
                  <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
                    <dt className="text-slate-500">{t("form.name")}</dt>
                    <dd className="flex flex-wrap items-center gap-2">
                      {r.name}
                      {r.user ? (
                        <Link
                          href={`/app/admin/members/${r.user.id}`}
                          className="inline-flex items-center gap-1 text-brand-700 underline"
                        >
                          <UserRound aria-hidden="true" className="size-3.5" />
                          {displayName(r.user, locale)}
                        </Link>
                      ) : (
                        <Badge tone="slate">{t("admin.visitor")}</Badge>
                      )}
                    </dd>
                    <dt className="text-slate-500">{t("form.email")}</dt>
                    <dd className="break-all">{r.email}</dd>
                    {r.page ? (
                      <>
                        <dt className="text-slate-500">{t("admin.page")}</dt>
                        <dd className="font-mono text-xs break-all">
                          {r.page}
                        </dd>
                      </>
                    ) : null}
                    <dt className="text-slate-500">{t("admin.language")}</dt>
                    <dd>{r.locale === "en" ? "English" : "日本語"}</dd>
                    {r.closedAt ? (
                      <>
                        <dt className="text-slate-500">
                          {t("admin.closedAt")}
                        </dt>
                        <dd>{formatDateTime(r.closedAt, locale)}</dd>
                      </>
                    ) : null}
                  </dl>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={reply}
                      className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"
                    >
                      <Mail aria-hidden="true" className="size-4" />
                      {t("admin.reply")}
                    </a>
                    <form action={setSupportClosedAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input
                        type="hidden"
                        name="close"
                        value={r.closedAt ? "0" : "1"}
                      />
                      <SubmitButton variant="secondary">
                        {r.closedAt ? t("admin.reopen") : t("admin.close")}
                      </SubmitButton>
                    </form>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
