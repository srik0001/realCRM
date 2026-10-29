"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, Plus, UserRound } from "lucide-react";
import { cn } from "@/utils/cn";
import { toneOf } from "@/utils/tones";
import { useCurrentUser } from "@/lib/auth/auth-context";
import { hasPermission } from "@/lib/auth/permissions";
import { useCrmData } from "@/lib/database/crm-data-context";
import { useUIStore } from "@/store/ui-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { applyLeadFilters, EMPTY_FILTERS, sortLeads, type LeadFilters, type LeadSortKey, type SortDir } from "@/utils/leads";
import { downloadCSV } from "@/utils/csv";
import { formatDate, formatDateTime } from "@/utils/format";
import { LeadFiltersBar } from "./lead-filters";
import { LeadTable } from "./lead-table";
import { useLeadActions } from "./lead-actions-host";

const PAGE_SIZE = 25;

export function LeadsView() {
  const me = useCurrentUser();
  const data = useCrmData();
  const { leads, statuses, projects, sources, subSources, users, departments } = data;
  const params = useSearchParams();
  const setCreateOpen = useUIStore((s) => s.setCreateLeadOpen);
  const { open: openAction, dialogs } = useLeadActions();

  const qParam = params.get("q") ?? "";
  const [filters, setFiltersState] = useState<LeadFilters>({ ...EMPTY_FILTERS, q: qParam });
  const [sortKey, setSortKey] = useState<LeadSortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const setFilters = (next: LeadFilters) => {
    setFiltersState(next);
    setPage(1);
  };

  // Header search navigates here with ?q=; keep the box in sync.
  const [seenQ, setSeenQ] = useState(qParam);
  if (qParam !== seenQ) {
    setSeenQ(qParam);
    setFiltersState((f) => ({ ...f, q: qParam }));
    setPage(1);
  }

  const filtered = useMemo(
    () => sortLeads(applyLeadFilters(leads.items, filters), sortKey, sortDir, statuses.byId),
    [leads.items, filters, sortKey, sortDir, statuses.byId],
  );
  // Counts for the status tabs ignore the status filter itself, so every tab shows what it would hold.
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let all = 0;
    for (const l of applyLeadFilters(leads.items, { ...filters, statusId: "" })) {
      counts[l.statusId] = (counts[l.statusId] ?? 0) + 1;
      all++;
    }
    return { all, counts };
  }, [leads.items, filters]);
  const statusTabs = useMemo(
    () => [...statuses.items].sort((a, b) => a.order - b.order).filter((s) => statusCounts.counts[s.id] || filters.statusId === s.id),
    [statuses.items, statusCounts, filters.statusId],
  );

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const onSort = (key: LeadSortKey) => {
    setPage(1);
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" || key === "status" ? "asc" : "desc");
    }
  };

  const exportCsv = () => {
    downloadCSV(
      `leads-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Name", "Phone", "Alternate Phone", "Email", "Project", "Status", "Source", "Sub-source", "Assigned User", "Department", "Follow-up", "Budget", "Preferred Location", "Created", "Last Activity"],
      filtered.map((l) => [
        l.name, l.phone, l.altPhone, l.email,
        projects.byId[l.projectId]?.name, statuses.byId[l.statusId]?.name, sources.byId[l.sourceId]?.name,
        l.subSourceId ? subSources.byId[l.subSourceId]?.name : "", users.byId[l.assignedTo]?.fullName,
        departments.byId[l.departmentId]?.name, l.followUpDate, l.budget, l.preferredLocation,
        formatDate(l.createdAt), formatDateTime(l.lastActivityAt),
      ]),
    );
  };

  const canCreate = hasPermission(me, "leads:create");
  const n = leads.items.length;
  const scopeText =
    me.role === "admin"
      ? `${n} company lead${n === 1 ? "" : "s"}`
      : me.role === "dept_head"
        ? `${n} lead${n === 1 ? "" : "s"} in your department`
        : `${n} lead${n === 1 ? "" : "s"} assigned to you`;

  return (
    <div>
      <PageHeader
        title="Leads"
        description={
          <>
            {scopeText} · <span className="font-medium text-brand-600">updates live</span>
          </>
        }
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            {canCreate && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Create Lead
              </Button>
            )}
          </>
        }
      />
      {!leads.loading && statusCounts.all > 0 && (
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label="Filter by status">
          <StatusTab label="All" count={statusCounts.all} active={!filters.statusId} onClick={() => setFilters({ ...filters, statusId: "" })} />
          {statusTabs.map((s) => (
            <StatusTab
              key={s.id}
              label={s.name}
              color={toneOf(s.color).fg}
              count={statusCounts.counts[s.id] ?? 0}
              active={filters.statusId === s.id}
              onClick={() => setFilters({ ...filters, statusId: filters.statusId === s.id ? "" : s.id })}
            />
          ))}
        </div>
      )}
      <div className="mb-5">
        <LeadFiltersBar value={filters} onChange={setFilters} />
      </div>
      <Card className="overflow-hidden">
        {leads.loading ? (
          <TableSkeleton />
        ) : leads.error ? (
          <ErrorState message="Leads could not be loaded. You may not have access, or the connection dropped." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<UserRound className="h-6 w-6" />}
            title={leads.items.length === 0 ? "No leads yet" : "No leads match your filters"}
            description={leads.items.length === 0 ? "Leads you create or are assigned will appear here." : "Try clearing some filters."}
            action={
              leads.items.length === 0 && canCreate ? (
                <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Create Lead</Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <LeadTable leads={pageItems} sortKey={sortKey} sortDir={sortDir} onSort={onSort} onAction={openAction} />
            <Pagination page={currentPage} pageSize={PAGE_SIZE} total={filtered.length} onPage={setPage} noun="leads" />
          </>
        )}
      </Card>
      {dialogs}
    </div>
  );
}

function StatusTab({ label, count, active, color, onClick }: { label: string; count: number; active: boolean; color?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-[15px] font-medium transition-all",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-[0_6px_16px_-8px_oklch(0.51_0.105_168/0.7)]"
          : "border-border bg-card text-slate-700 hover:border-slate-300 hover:bg-slate-100",
      )}
    >
      {color && !active && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />}
      {label}
      <span className={cn("tabular-nums", active ? "text-primary-foreground/80" : "text-slate-400")}>{count}</span>
    </button>
  );
}
