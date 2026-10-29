import type { ReactNode } from "react";
import { Card, PanelHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export type BreakdownRow = { id: string; label: string; value: number; color?: string };

/** Horizontal bar breakdown; each bar shows the row's share of the total. */
export function BreakdownChart({
  title,
  description,
  rows,
  loading,
  total,
  action,
}: {
  title: string;
  description?: string;
  rows: BreakdownRow[];
  loading?: boolean;
  total?: number;
  action?: ReactNode;
}) {
  const sum = total ?? rows.reduce((s, r) => s + r.value, 0);
  return (
    <Card className="card-lift flex flex-col">
      <PanelHeader title={title} description={description} action={action} />
      <div className="flex-1 space-y-4 px-6 pb-6 pt-5">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8" />)
        ) : rows.length === 0 || sum === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">No data for the current filters.</p>
        ) : (
          rows.map((r) => {
            const pct = Math.round((r.value / sum) * 100);
            return (
              <div key={r.id} className="group" title={`${r.label}: ${r.value} (${pct}%)`}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="truncate text-[15px] font-medium text-slate-800">{r.label}</span>
                  <span className="shrink-0 tabular-nums text-sm text-slate-500">
                    {r.value}
                    <span className="ml-1.5 font-semibold text-slate-900">{pct}%</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-[width,filter] duration-700 ease-out group-hover:brightness-110"
                    style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: r.color ?? "var(--primary)" }}
                    role="presentation"
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}

/** Count items by key, labelled via `labels`, sorted by count desc. Keys with no label are grouped as "Other". */
export function countBy<T>(items: T[], key: (item: T) => string | undefined, labels: Record<string, string>, includeZero?: string[]): BreakdownRow[] {
  const counts = new Map<string, number>();
  for (const id of includeZero ?? []) counts.set(id, 0);
  for (const item of items) {
    const k = key(item) || "__none";
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([id, value]) => ({ id, value, label: labels[id] ?? (id === "__none" ? "None" : "Other") }))
    .sort((a, b) => b.value - a.value);
}
