import { Check, Eye, Lock, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Link } from "@/i18n/navigation";
import {
  AUDIENCES,
  type Audience,
  type Reach,
  seenBy,
} from "@/lib/profile-visibility";

/**
 * 「公開範囲」 on my own profile: one chip per audience (会員全員 / フォロワー /
 * 家族), ticked when that audience sees the field. Colour is never the only
 * cue — each chip has a ✓ / ✕ and a screen-reader word.
 */
export function ReachTag({
  reach,
  className,
}: {
  reach: Reach;
  className?: string;
}) {
  const t = useTranslations("profile.visibility");
  if (reach === "self") {
    return (
      <span className={cn("mt-1 flex flex-wrap gap-1", className)}>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
          <Lock aria-hidden="true" className="size-3" />
          {t("onlyYou")}
        </span>
      </span>
    );
  }
  return (
    <span className={cn("mt-1 flex flex-wrap gap-1", className)}>
      {AUDIENCES.map((a) => {
        const shown = seenBy(reach, a);
        const Icon = shown ? Check : X;
        return (
          <span
            key={a}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              shown
                ? "bg-green-50 text-green-800"
                : "bg-slate-100 text-slate-500",
            )}
          >
            <Icon aria-hidden="true" className="size-3" />
            {t(`audiences.${a}`)}
            <span className="sr-only">
              : {shown ? t("shown") : t("hidden")}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** 「〇〇として見る」: open my profile as each audience sees it. */
export function ViewAsLinks({
  memberId,
  current,
}: {
  memberId: string;
  current?: Audience;
}) {
  const t = useTranslations("profile.visibility");
  return (
    <div className="flex flex-wrap gap-2">
      {AUDIENCES.map((a) => (
        <Link
          key={a}
          href={`/app/members/${memberId}?as=${a}`}
          aria-current={a === current ? "page" : undefined}
          className={buttonClass(a === current ? "primary" : "secondary")}
        >
          <Eye aria-hidden="true" className="size-4" />
          {t(`viewAs.${a}`)}
        </Link>
      ))}
    </div>
  );
}

/** What a viewer can't see, named instead of silently left out. */
export function HiddenFields({ labels }: { labels: string[] }) {
  const t = useTranslations("profile.visibility");
  if (!labels.length) return null;
  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <p className="text-sm text-slate-600">{t("hiddenTitle")}</p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {labels.map((l) => (
          <li
            key={l}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
          >
            <Lock aria-hidden="true" className="size-3" />
            {l}
            <span className="sr-only">: {t("hidden")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
