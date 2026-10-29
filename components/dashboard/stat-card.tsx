import type { LucideIcon } from "lucide-react";
import { TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TONES, type Tone } from "@/utils/tones";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "green",
  hint,
  loading,
  delay = 0,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: Tone;
  hint?: string;
  loading?: boolean;
  /** Stagger for the entrance animation, in ms. */
  delay?: number;
}) {
  const t = TONES[tone];
  return (
    <Card className="card-lift animate-rise-in p-5 sm:p-6" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between gap-3">
        <p className="truncate text-[15px] font-medium text-slate-600">{label}</p>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: t.soft, color: t.fg }}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-10 w-16" />
      ) : (
        <p className="mt-2 font-display text-4xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-[44px] sm:leading-[1.1]">{value}</p>
      )}
      {hint && (
        <p className="mt-2 flex items-center gap-1.5 truncate text-sm font-medium" style={{ color: TONES.green.fg }}>
          <TrendingUp className="h-3.5 w-3.5 shrink-0" />
          {hint}
        </p>
      )}
    </Card>
  );
}
