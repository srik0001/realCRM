import { cn } from "@/utils/cn";
import { initials } from "@/utils/format";

const palette = ["bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700", "bg-violet-100 text-violet-700", "bg-amber-100 text-amber-800", "bg-pink-100 text-pink-700", "bg-teal-100 text-teal-700"];

export function Avatar({ name, className }: { name?: string; className?: string }) {
  const idx = name ? [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % palette.length : 0;
  return (
    <span className={cn("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold", palette[idx], className)} aria-hidden>
      {initials(name)}
    </span>
  );
}
