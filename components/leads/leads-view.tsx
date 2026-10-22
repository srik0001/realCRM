"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, Plus, UserRound } from "lucide-react";
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
  const scopeText =
    me.role === "admin" ? "All company leads" : me.role === "dept_head" ? "Leads in your department" : "Leads assigned to you";

  return (
    <div>
      <PageHeader
        title="Leads"
        description={`${scopeText} · updates live`}
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
      <div className="mb-4">
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
            <Pagination page={currentPage} pageSize={PAGE_SIZE} total={filtered.length} onPage={setPage} />
          </>
        )}
      </Card>
      {dialogs}
    </div>
  );
}
