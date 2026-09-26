import { cn } from "@/components/ui/cn";
import { renderMarkdown } from "@/lib/markdown";

/**
 * Renders admin-authored Markdown. `renderMarkdown` escapes all HTML first and
 * only emits a fixed tag whitelist, so dangerouslySetInnerHTML is safe here.
 */
export function MarkdownBody({
  source,
  className,
}: {
  source: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "space-y-3 break-words text-slate-800 leading-relaxed",
        "[&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h4]:font-semibold",
        "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1",
        "[&_a]:text-brand-700 [&_a]:underline [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1",
        className,
      )}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: output of the escaping renderer in src/lib/markdown.ts
      dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }}
    />
  );
}
