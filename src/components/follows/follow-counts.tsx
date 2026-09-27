import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

/**
 * 「フォロワー N」「フォロー中 N」 (accepted follows only). On your own
 * profile they link to your lists; on other members' profiles they are plain
 * text, since other people's connections are not browsable.
 */
export async function FollowCounts({
  followers,
  following,
  linked,
}: {
  followers: number;
  following: number;
  linked: boolean;
}) {
  const t = await getTranslations("follows");
  const b = (chunks: ReactNode) => (
    <span className="font-semibold text-slate-900">{chunks}</span>
  );
  const items = [
    {
      key: "followers",
      label: t.rich("counts.followers", { count: followers, b }),
    },
    {
      key: "following",
      label: t.rich("counts.following", { count: following, b }),
    },
  ] as const;
  return (
    <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-slate-600 sm:justify-start">
      {items.map((item) => (
        <li key={item.key}>
          {linked ? (
            <Link
              href={`/app/follows?tab=${item.key}`}
              className="inline-flex min-h-11 items-center underline-offset-2 hover:underline sm:min-h-0"
            >
              {item.label}
            </Link>
          ) : (
            item.label
          )}
        </li>
      ))}
    </ul>
  );
}
