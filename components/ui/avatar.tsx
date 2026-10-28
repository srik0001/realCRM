import { cn } from "@/utils/cn";
import { initials } from "@/utils/format";
import { TONES, type Tone } from "@/utils/tones";

const palette: Tone[] = ["blue", "green", "violet", "amber", "pink", "teal"];

export function Avatar({ name, className }: { name?: string; className?: string }) {
  const idx = name ? [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % palette.length : 0;
  const tone = TONES[palette[idx]];
  return (
    <span
      className={cn("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold", className)}
      style={{ backgroundColor: tone.soft, color: tone.fg }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
