import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { LinkPendingIcon } from "@/components/ui/link-pending";
import { Link } from "@/i18n/navigation";

/** Dashboard card with a heading and an optional "see all" link. */
export function DashboardSection({
  id,
  title,
  moreHref,
  moreLabel,
  children,
}: {
  id: string;
  title: string;
  moreHref?: string;
  moreLabel?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      <Card className="h-full">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id={id} className="text-lg font-semibold">
            {title}
          </h2>
          {moreHref && moreLabel ? (
            <Link
              href={moreHref}
              className="inline-flex min-h-11 items-center text-sm text-brand-700 underline"
            >
              {moreLabel}
            </Link>
          ) : null}
        </div>
        {children}
      </Card>
    </section>
  );
}

/** A highlighted "you have something to do" row. */
export function ActionItem({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 hover:bg-amber-100"
      >
        <span>{children}</span>
        <LinkPendingIcon>
          <span aria-hidden="true">→</span>
        </LinkPendingIcon>
      </Link>
    </li>
  );
}
