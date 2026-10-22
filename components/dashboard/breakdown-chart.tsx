import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export type BreakdownRow = { id: string; label: string; value: number };

/** Horizontal bar breakdown; bars are scaled to the largest value. */
export function BreakdownChart({
  title,
  rows,
  loading,
  total,
}: {
  title: string;
  rows: BreakdownRow[];
  loading?: boolean;
  total?: number;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const sum = total ?? rows.reduce((s, r) => s + r.value, 0);
  return (
    <Card>
      <CardHeader title={title} />
      <div className="space-y-3 px-5 py-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6" />)
        ) : rows.length === 0 || sum === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No data for the current filters.</p>
        ) : (
          rows.map((r) => (
            <div key={r.id}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-slate-700">{r.label}</span>
                <span className="shrink-0 tabular-nums text-slate-900">
                  <span className="font-semibold">{r.value}</span>
                  <span className="ml-1.5 text-xs text-slate-500">{Math.round((r.value / sum) * 100)}%</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-500 transition-[width] duration-500"
                  style={{ width: `${(r.value / max) * 100}%` }}
                  role="presentation"
                />
              </div>
            </div>
          ))
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
