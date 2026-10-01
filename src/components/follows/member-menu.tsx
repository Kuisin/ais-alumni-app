import { Flag, MoreHorizontal } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BlockControl } from "./block-control";

/**
 * Secondary relationship actions — report to the committee (お問い合わせ →
 * 会員の言動について) and block — kept out of the way of the primary follow
 * button. A native disclosure, so it works without JS and
 * is keyboard-accessible.
 */
export async function MemberMenu({
  targetId,
  name,
}: {
  targetId: string;
  name: string;
}) {
  const t = await getTranslations("follows");
  return (
    <details className="relative">
      <summary className="inline-flex size-11 cursor-pointer list-none items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 [&::-webkit-details-marker]:hidden">
        <MoreHorizontal aria-hidden="true" className="size-5" />
        <span className="sr-only">{t("menu.label")}</span>
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-72 max-w-[calc(100vw-2rem)] animate-fade rounded-xl border border-slate-200 bg-white p-2 text-left shadow-lg">
        <Link
          href="/support?type=COMPLAINT&topic=MEMBER_CONDUCT"
          className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          <Flag aria-hidden="true" className="size-4" />
          {t("actions.report")}
        </Link>
        <BlockControl targetId={targetId} name={name} blocked={false} />
      </div>
    </details>
  );
}
