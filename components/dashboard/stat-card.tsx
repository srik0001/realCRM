import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";

const accents = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-emerald-50 text-emerald-600",
  red: "bg-red-50 text-red-600",
  amber: "bg-amber-50 text-amber-600",
  violet: "bg-violet-50 text-violet-600",
  slate: "bg-slate-100 text-slate-600",
} as const;

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "blue",
  hint,
  loading,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent?: keyof typeof accents;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-500">{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-14" />
          ) : (
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{value}</p>
          )}
          {hint && <p className="mt-0.5 truncate text-xs text-slate-500">{hint}</p>}
        </div>
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", accents[accent])}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
    </Card>
  );
}
