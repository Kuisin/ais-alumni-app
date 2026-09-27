import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

/** Breadcrumb-style "back" link shown above a page's h1. */
export function BackLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="mb-2 inline-flex min-h-11 items-center gap-1 rounded text-sm text-brand-700 hover:text-brand-800 hover:underline"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      {children}
    </Link>
  );
}
