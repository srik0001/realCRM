"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/utils/cn";

/** Page numbers to show: first, last, and a window around the current page, with gaps as null. */
function pageList(page: number, pages: number): (number | null)[] {
  const keep = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  const sorted = [...keep].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? [null, p] : [p]));
}

const btn = "flex h-10 min-w-10 items-center justify-center rounded-xl px-2 text-sm font-semibold transition-colors";

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  noun = "results",
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
  noun?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const shown = Math.max(0, Math.min(total, page * pageSize) - (page - 1) * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 text-sm text-slate-500">
      <p>
        Showing <span className="font-semibold text-slate-900">{shown}</span> of{" "}
        <span className="font-semibold text-slate-900">{total}</span> {noun}
      </p>
      <nav className="flex items-center gap-1.5" aria-label="Pagination">
        <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page"
          className={cn(btn, "border border-border bg-card text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-card")}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pageList(page, pages).map((p, i) =>
          p === null ? (
            <span key={`gap-${i}`} className="px-1 text-slate-400">…</span>
          ) : (
            <button key={p} type="button" onClick={() => onPage(p)} aria-current={p === page ? "page" : undefined}
              className={cn(btn, p === page ? "bg-primary text-primary-foreground shadow-sm" : "text-slate-700 hover:bg-slate-100")}>
              {p}
            </button>
          ),
        )}
        <button type="button" onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Next page"
          className={cn(btn, "border border-border bg-card text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-card")}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}
