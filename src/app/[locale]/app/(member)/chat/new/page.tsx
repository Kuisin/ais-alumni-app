import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { StartTalkList } from "@/components/chat/start-talk";
import { BackLink } from "@/components/ui/back-link";
import { buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { loadConnections, photoFor } from "@/lib/avatar";
import { directChatAvailable, directChatCandidates } from "@/lib/chat-db";
import { DIRECT_CHAT_ENABLED } from "@/lib/features";
import { requireActive } from "@/lib/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/chat/new">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "chat" });
  return { title: t("new.title") };
}

/**
 * Start a 1:1 talk with a mutual follower (like LINE friends), as the
 * member types allow (admin → チャット).
 */
export default async function NewTalkPage() {
  if (!DIRECT_CHAT_ENABLED) notFound();
  const user = await requireActive();
  const t = await getTranslations("chat");
  const [available, people, conn] = await Promise.all([
    directChatAvailable(user.id),
    directChatCandidates(user.id),
    loadConnections(user.id),
  ]);
  return (
    <div className="space-y-4">
      <div>
        <BackLink href="/app/chat">{t("room.back")}</BackLink>
        <PageHeader title={t("new.title")} description={t("new.hint")} />
      </div>
      {!available ? (
        <div className="rounded-xl bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
          <p className="font-medium">{t("new.restricted")}</p>
        </div>
      ) : people.length ? (
        <StartTalkList
          people={people.map((p) => ({
            id: p.id,
            name: p.nameRomaji ?? p.nameKanji ?? "—",
            kanji: p.nameRomaji ? p.nameKanji : null,
            avatar: photoFor(conn, p),
          }))}
        />
      ) : (
        <div className="rounded-xl bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
          <p className="font-medium">{t("new.empty")}</p>
          <p className="mt-1">{t("new.emptyHint")}</p>
          <Link
            href="/app/directory"
            className={buttonClass("secondary", "mt-4")}
          >
            {t("new.findMembers")}
          </Link>
        </div>
      )}
    </div>
  );
}
