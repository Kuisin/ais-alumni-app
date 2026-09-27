import type { ReactNode } from "react";

/**
 * Sticky "jump to section" chips for long admin detail pages. Scrolls
 * sideways on phones; sections need `scroll-mt-32` so headings clear it.
 */
export function SectionNav({
  label,
  items,
}: {
  label: string;
  items: { id: string; label: string; icon?: ReactNode }[];
}) {
  return (
    <nav
      aria-label={label}
      className="sticky top-[3.75rem] z-30 -mx-4 border-b border-slate-200 bg-slate-50/95 px-4 py-2 backdrop-blur lg:mx-0 lg:rounded-xl lg:border"
    >
      <ul className="relative flex snap-x gap-1 overflow-x-auto [mask-image:linear-gradient(to_right,black_90%,transparent)] lg:flex-wrap lg:overflow-visible lg:[mask-image:none]">
        {items.map((item) => (
          <li key={item.id} className="shrink-0 snap-start">
            <a
              href={`#${item.id}`}
              className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium whitespace-nowrap text-slate-700 hover:bg-white hover:shadow-sm"
            >
              {item.icon ? <span aria-hidden="true">{item.icon}</span> : null}
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Card with a heading, used as a jump target by SectionNav. */
export function AdminSection({
  id,
  title,
  icon,
  description,
  children,
  className,
}: {
  id: string;
  title: string;
  icon?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`scroll-mt-32 ${className ?? ""}`}
    >
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2
          id={`${id}-title`}
          className="mb-4 flex items-center gap-2 text-lg font-semibold"
        >
          {icon ? (
            <span aria-hidden="true" className="text-brand-700 [&_svg]:size-5">
              {icon}
            </span>
          ) : null}
          {title}
        </h2>
        {description ? (
          <p className="-mt-2 mb-4 text-sm text-slate-600">{description}</p>
        ) : null}
        {children}
      </div>
    </section>
  );
}
