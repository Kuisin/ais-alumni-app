"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { canGoBackInApp } from "@/components/layout/nav-history";
import { Link } from "@/i18n/navigation";
import { LinkPendingIcon } from "./link-pending";

/**
 * BackLink for pages with more than one way in (a member's profile from the
 * directory, follows, family or a chat): goes back to where the member came
 * from, or to `fallback` after a fresh load or a link from outside.
 */
export function HistoryBackLink({
  fallback,
  children,
}: {
  fallback: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <Link
      href={fallback}
      onClick={(e) => {
        if (!canGoBackInApp()) return;
        e.preventDefault();
        router.back();
      }}
      className="mb-2 inline-flex min-h-11 items-center gap-1 rounded text-sm text-brand-700 hover:text-brand-800 hover:underline"
    >
      <LinkPendingIcon>
        <ArrowLeft aria-hidden="true" className="size-4" />
      </LinkPendingIcon>
      {children}
    </Link>
  );
}
