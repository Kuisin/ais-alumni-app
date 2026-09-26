import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";

export function SettingsSection({
  id,
  title,
  description,
  children,
  tone = "default",
}: {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <section aria-labelledby={`${id}-title`} id={id} className="scroll-mt-20">
      <Card className={cn(tone === "danger" && "border-red-200 bg-red-50/40")}>
        <h2
          id={`${id}-title`}
          className={cn(
            "text-lg font-semibold",
            tone === "danger" && "text-red-800",
          )}
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        ) : null}
        <div className="mt-4 space-y-4">{children}</div>
      </Card>
    </section>
  );
}
