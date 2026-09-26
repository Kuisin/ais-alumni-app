import { getTranslations } from "next-intl/server";
import { Card, EmptyState } from "@/components/ui/card";

export type BarRow = { key: string; label: string; value: number };

/**
 * Accessible bar chart: a real table (label, count, share) with a decorative
 * CSS bar per row. Screen readers get the numbers; the bars are aria-hidden.
 */
export async function BarTable({
  id,
  title,
  rows,
  total,
  note,
}: {
  id: string;
  title: string;
  rows: BarRow[];
  /** denominator for the share column; defaults to the sum of rows */
  total?: number;
  note?: string;
}) {
  const t = await getTranslations("adminStats");
  const sum = total ?? rows.reduce((a, r) => a + r.value, 0);
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card>
      <h2 id={`${id}-title`} className="text-lg font-semibold">
        {title}
      </h2>
      {note ? <p className="mt-1 text-sm text-slate-600">{note}</p> : null}
      {rows.length === 0 || sum === 0 ? (
        <div className="mt-3">
          <EmptyState>{t("noData")}</EmptyState>
        </div>
      ) : (
        <table
          aria-labelledby={`${id}-title`}
          className="mt-3 w-full border-collapse text-sm"
        >
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th scope="col" className="py-1 pr-2 font-medium">
                {t("label")}
              </th>
              <th
                scope="col"
                className="w-12 py-1 pr-2 text-right font-medium whitespace-nowrap"
              >
                {t("count")}
              </th>
              <th
                scope="col"
                className="w-12 py-1 pr-2 text-right font-medium whitespace-nowrap"
              >
                {t("share")}
              </th>
              <th scope="col" className="w-1/4 py-1 font-medium sm:w-2/5">
                <span className="sr-only">{t("bar")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-slate-100">
                <th
                  scope="row"
                  className="py-2 pr-2 text-left font-normal break-words"
                >
                  {r.label}
                </th>
                <td className="py-2 pr-2 text-right tabular-nums">{r.value}</td>
                <td className="py-2 pr-2 text-right text-slate-600 tabular-nums">
                  {sum ? `${Math.round((r.value / sum) * 100)}%` : "—"}
                </td>
                <td className="py-2" aria-hidden="true">
                  <div className="h-3 w-full rounded bg-slate-100">
                    <div
                      className="h-3 rounded bg-brand-700"
                      style={{ width: `${(r.value / max) * 100}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
