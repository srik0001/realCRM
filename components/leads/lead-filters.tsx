"use client";

import { useState } from "react";
import { Filter, X } from "lucide-react";
import { useCurrentUser } from "@/lib/auth/auth-context";
import { useCrmData } from "@/lib/database/crm-data-context";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { activeFilterCount, EMPTY_FILTERS, type LeadFilters } from "@/utils/leads";
import { cn } from "@/utils/cn";

type Props = {
  value: LeadFilters;
  onChange: (next: LeadFilters) => void;
  /** Hide the free-text search (the dashboard doesn't need it). */
  hideSearch?: boolean;
};

export function LeadFiltersBar({ value, onChange, hideSearch }: Props) {
  const me = useCurrentUser();
  const { projects, statuses, sources, subSources, departments, users } = useCrmData();
  const [expanded, setExpanded] = useState(false);
  const set = (patch: Partial<LeadFilters>) => onChange({ ...value, ...patch });
  const count = activeFilterCount(value);

  const canFilterPeople = me.role === "admin" || me.role === "dept_head";
  const people = users.items.filter(
    (u) => u.role !== "admin" && (me.role === "admin" || u.departmentId === me.departmentId),
  );
  const visibleSubSources = subSources.items.filter((s) => !value.sourceId || s.sourceId === value.sourceId);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        {!hideSearch && (
          <div className="relative flex-1">
            <Input
              type="search"
              value={value.q}
              onChange={(e) => set({ q: e.target.value })}
              placeholder="Search by name, email or phone"
              aria-label="Search leads"
            />
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setExpanded((e) => !e)} aria-expanded={expanded}>
            <Filter className="h-4 w-4" />
            Filters
            {count > 0 && (
              <span className="rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white">{count}</span>
            )}
          </Button>
          {count > 0 && (
            <Button variant="ghost" onClick={() => onChange({ ...EMPTY_FILTERS, q: value.q })}>
              <X className="h-4 w-4" /> Clear
            </Button>
          )}
        </div>
      </div>

      <div className={cn("grid transition-[grid-template-rows] duration-200", expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect label="Project" value={value.projectId} onChange={(v) => set({ projectId: v })}
              options={projects.items.map((p) => [p.id, p.name])} />
            <FilterSelect label="Status" value={value.statusId} onChange={(v) => set({ statusId: v })}
              options={statuses.items.map((s) => [s.id, s.name])} />
            <FilterSelect label="Source" value={value.sourceId} onChange={(v) => set({ sourceId: v, subSourceId: "" })}
              options={sources.items.map((s) => [s.id, s.name])} />
            <FilterSelect label="Sub-source" value={value.subSourceId} onChange={(v) => set({ subSourceId: v })}
              options={visibleSubSources.map((s) => [s.id, s.name])} />
            {me.role === "admin" && (
              <FilterSelect label="Department" value={value.departmentId} onChange={(v) => set({ departmentId: v })}
                options={departments.items.map((d) => [d.id, d.name])} />
            )}
            {canFilterPeople && (
              <FilterSelect label="Assigned user" value={value.assignedTo} onChange={(v) => set({ assignedTo: v })}
                options={people.map((u) => [u.id, u.fullName])} />
            )}
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600">Created from</span>
              <Input type="date" value={value.from} max={value.to || undefined} onChange={(e) => set({ from: e.target.value })} />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600">Created to</span>
              <Input type="date" value={value.to} min={value.from || undefined} onChange={(e) => set({ to: e.target.value })} />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {options.map(([id, name]) => (
          <option key={id} value={id}>{name}</option>
        ))}
      </Select>
    </label>
  );
}
