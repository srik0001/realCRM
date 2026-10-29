/** Status tones stored on lead statuses, mapped onto the theme's status palette. */
export type Tone = "slate" | "blue" | "green" | "red" | "amber" | "violet" | "teal" | "pink";

export const TONES: Record<Tone, { fg: string; soft: string }> = {
  blue: { fg: "var(--status-new)", soft: "var(--status-new-soft)" },
  violet: { fg: "var(--status-interested)", soft: "var(--status-interested-soft)" },
  pink: { fg: "var(--status-visit)", soft: "var(--status-visit-soft)" },
  amber: { fg: "var(--status-negotiation)", soft: "var(--status-negotiation-soft)" },
  green: { fg: "var(--status-won)", soft: "var(--status-won-soft)" },
  red: { fg: "var(--status-lost)", soft: "var(--status-lost-soft)" },
  teal: { fg: "var(--status-followup)", soft: "var(--status-followup-soft)" },
  slate: { fg: "var(--status-neutral)", soft: "var(--status-neutral-soft)" },
};

export const toneOf = (tone?: string) => TONES[tone as Tone] ?? TONES.slate;

/** Ordered palette for categorical charts (sources, projects, ...). */
export const CHART_COLORS = [
  "var(--status-won)",
  "var(--status-new)",
  "var(--status-interested)",
  "var(--status-negotiation)",
  "var(--status-visit)",
  "var(--status-followup)",
  "var(--status-neutral)",
];
