"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useCrmData } from "@/lib/database/crm-data-context";
import { matchesLeadSearch } from "@/utils/leads";
import { cn } from "@/utils/cn";

export function GlobalSearch() {
  const { leads, statuses } = useCrmData();
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(
    () => (term.trim().length < 2 ? [] : leads.items.filter((l) => matchesLeadSearch(l, term)).slice(0, 8)),
    [leads.items, term],
  );

  useEffect(() => {
    const onDown = (e: MouseEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const go = (href: string) => {
    setOpen(false);
    setTerm("");
    inputRef.current?.blur();
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[highlight]) go(`/leads/${results[highlight].id}`);
      else if (term.trim()) go(`/leads?q=${encodeURIComponent(term.trim())}`);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        ref={inputRef}
        type="search"
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search leads by name, email or phone"
        aria-label="Search leads"
        className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      />
      {open && term.trim().length >= 2 && (
        <div className="animate-pop-in absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">No leads match “{term}”.</p>
          ) : (
            <ul role="listbox">
              {results.map((lead, i) => (
                <li key={lead.id} role="option" aria-selected={i === highlight}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => go(`/leads/${lead.id}`)}
                    className={cn("flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left", i === highlight && "bg-slate-50")}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-900">{lead.name}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {lead.phone} · {lead.email}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">{statuses.byId[lead.statusId]?.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => go(`/leads?q=${encodeURIComponent(term.trim())}`)}
            className="block w-full border-t border-slate-100 px-4 py-2 text-left text-xs font-medium text-brand-600 hover:bg-slate-50"
          >
            See all results in Leads
          </button>
        </div>
      )}
    </div>
  );
}
