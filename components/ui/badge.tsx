import type { ReactNode } from "react";
import { cn } from "@/utils/cn";
import { TONES, toneOf, type Tone } from "@/utils/tones";

export const BADGE_TONES = Object.keys(TONES) as Tone[];

export function Badge({
  tone = "slate",
  dot,
  className,
  children,
}: {
  tone?: Tone | string;
  /** Show a leading colour dot, as used for pipeline statuses. */
  dot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const t = toneOf(tone);
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", className)}
      style={{ backgroundColor: t.soft, color: t.fg }}
    >
      {dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: t.fg }} aria-hidden />}
      {children}
    </span>
  );
}

export function StatusPill({ active }: { active: boolean }) {
  return <Badge tone={active ? "green" : "slate"} dot>{active ? "Active" : "Inactive"}</Badge>;
}
