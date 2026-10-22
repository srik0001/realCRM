import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

type Tone = "slate" | "blue" | "green" | "red" | "amber" | "violet" | "teal" | "pink";

const tones: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  teal: "bg-teal-50 text-teal-700 ring-teal-200",
  pink: "bg-pink-50 text-pink-700 ring-pink-200",
};

export const BADGE_TONES = Object.keys(tones) as Tone[];

export function Badge({ tone = "slate", className, children }: { tone?: Tone | string; className?: string; children: ReactNode }) {
  const toneClass = tones[(tone as Tone)] ?? tones.slate;
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", toneClass, className)}>
      {children}
    </span>
  );
}

export function StatusPill({ active }: { active: boolean }) {
  return <Badge tone={active ? "green" : "slate"}>{active ? "Active" : "Inactive"}</Badge>;
}
