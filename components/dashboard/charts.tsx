"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/utils/cn";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Monotone cubic interpolation (Fritsch–Carlson): smooth, and never overshoots below zero. */
function monotonePath(pts: [number, number][]): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const dx: number[] = [], m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0]);
    m.push((pts[i + 1][1] - pts[i][1]) / dx[i]);
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
  t.push(m[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${pts[i][0] + h},${pts[i][1] + t[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - t[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}

function niceMax(v: number) {
  if (v <= 4) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(v)));
  const n = Math.ceil(v / step);
  const nice = n <= 2 ? 2 : n <= 4 ? 4 : n <= 6 ? 6 : n <= 8 ? 8 : 10;
  return Math.max(nice * step, Math.ceil(v / 4) * 4);
}

export type SeriesPoint = { label: string; detail: string; value: number };

/** Single-series smooth area chart with a crosshair tooltip. */
export function AreaChart({ points, height = 300, color = "var(--primary)" }: { points: SeriesPoint[]; height?: number; color?: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { top: 12, right: 28, bottom: 28, left: 32 };
  const max = niceMax(Math.max(0, ...points.map((p) => p.value)));
  const ticks = [0, 1, 2, 3, 4].map((i) => (max / 4) * i);
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;
  const x = (i: number) => pad.left + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;
  const coords = points.map((p, i) => [x(i), y(p.value)] as [number, number]);
  const line = monotonePath(coords);
  const area = coords.length ? `${line} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z` : "";

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width;
    setHover(Math.max(0, Math.min(points.length - 1, Math.round(rel * (points.length - 1)))));
  };

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Lead intake per week">
          <defs>
            <linearGradient id="lead-flow-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeDasharray={t === 0 ? undefined : "3 5"} />
              <text x={pad.left - 10} y={y(t)} dy="0.35em" textAnchor="end" className="fill-slate-500 text-[11px] tabular-nums">
                {Math.round(t)}
              </text>
            </g>
          ))}
          {points.map((p, i) => (
            <text key={p.label} x={x(i)} y={height - 8} textAnchor="middle" className="fill-slate-500 text-[11px]">
              {p.label}
            </text>
          ))}
          <path d={area} fill="url(#lead-flow-fill)" />
          <path d={line} fill="none" stroke={color} strokeWidth={2.25} strokeLinecap="round" />
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={y(0)} stroke="var(--color-slate-300)" />
              <circle cx={x(hover)} cy={y(points[hover].value)} r={5} fill={color} stroke="var(--card)" strokeWidth={2} />
            </g>
          )}
          <rect
            x={pad.left}
            y={pad.top}
            width={innerW}
            height={innerH}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
      )}
      {hover !== null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg"
          style={{ left: Math.min(Math.max(x(hover), 70), width - 70), top: y(points[hover].value) - 12 }}
        >
          <p className="text-slate-500">{points[hover].detail}</p>
          <p className="mt-0.5 font-display text-sm font-semibold text-slate-900 tabular-nums">
            {points[hover].value} lead{points[hover].value === 1 ? "" : "s"}
          </p>
        </div>
      )}
    </div>
  );
}

export type Slice = { id: string; label: string; value: number; color: string };

/** Donut with a 2px surface gap between segments; hovering a segment shows it in the centre. */
export function DonutChart({
  slices,
  size = 200,
  thickness = 26,
  centerLabel,
  activeId,
  onActive,
}: {
  slices: Slice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  activeId?: string | null;
  onActive?: (id: string | null) => void;
}) {
  const [localActive, setLocalActive] = useState<string | null>(null);
  const active = activeId !== undefined ? activeId : localActive;
  const setActive = onActive ?? setLocalActive;
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const visible = slices.filter((s) => s.value > 0);
  const gap = visible.length > 1 ? 3 : 0;

  const arcs = useMemo(() => {
    const lens = visible.map((s) => (s.value / total) * c);
    return visible.map((s, i) => ({
      ...s,
      dash: Math.max(0, lens[i] - gap),
      offset: lens.slice(0, i).reduce((sum, l) => sum + l, 0),
    }));
  }, [visible, total, c, gap]);

  const focused = arcs.find((a) => a.id === active);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label={centerLabel}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={thickness} />
        {arcs.map((a) => (
          <circle
            key={a.id}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={a.color}
            strokeWidth={active === a.id ? thickness + 6 : thickness}
            strokeDasharray={`${a.dash} ${c - a.dash}`}
            strokeDashoffset={-a.offset}
            className={cn("cursor-pointer transition-[stroke-width,opacity] duration-200", active && active !== a.id && "opacity-40")}
            onPointerEnter={() => setActive(a.id)}
            onPointerLeave={() => setActive(null)}
          >
            <title>{`${a.label}: ${a.value}`}</title>
          </circle>
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="font-display text-4xl font-bold tracking-tight text-slate-900 tabular-nums">{focused ? focused.value : total}</p>
        <p className="mt-0.5 max-w-[60%] truncate text-sm text-slate-500">{focused ? focused.label : centerLabel}</p>
      </div>
    </div>
  );
}
