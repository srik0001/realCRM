import type { Lead, LeadStatus } from "@/types";
import { todayISO } from "./format";

export function matchesLeadSearch(lead: Lead, term: string): boolean {
  const t = term.trim().toLowerCase();
  if (!t) return true;
  const digits = t.replace(/\D/g, "");
  return (
    lead.name.toLowerCase().includes(t) ||
    lead.email.toLowerCase().includes(t) ||
    (digits.length >= 3 &&
      (lead.phone.replace(/\D/g, "").includes(digits) || (lead.altPhone ?? "").replace(/\D/g, "").includes(digits)))
  );
}

export function isClosed(lead: Lead, statuses: Record<string, LeadStatus>): boolean {
  const cat = statuses[lead.statusId]?.category;
  return cat === "won" || cat === "lost";
}

export function followUpState(lead: Lead, statuses: Record<string, LeadStatus>): "today" | "overdue" | null {
  if (!lead.followUpDate || isClosed(lead, statuses)) return null;
  const today = todayISO();
  if (lead.followUpDate === today) return "today";
  if (lead.followUpDate < today) return "overdue";
  return null;
}

export type LeadFilters = {
  q: string;
  projectId: string;
  statusId: string;
  sourceId: string;
  subSourceId: string;
  departmentId: string;
  assignedTo: string;
  /** Inclusive created-date range, YYYY-MM-DD. */
  from: string;
  to: string;
};

export const EMPTY_FILTERS: LeadFilters = {
  q: "",
  projectId: "",
  statusId: "",
  sourceId: "",
  subSourceId: "",
  departmentId: "",
  assignedTo: "",
  from: "",
  to: "",
};

export function activeFilterCount(f: LeadFilters): number {
  return (Object.keys(f) as (keyof LeadFilters)[]).filter((k) => k !== "q" && f[k]).length;
}

export function applyLeadFilters(leads: Lead[], f: LeadFilters): Lead[] {
  const fromTs = f.from ? new Date(`${f.from}T00:00:00`).getTime() : null;
  const toTs = f.to ? new Date(`${f.to}T23:59:59.999`).getTime() : null;
  return leads.filter(
    (l) =>
      (!f.projectId || l.projectId === f.projectId) &&
      (!f.statusId || l.statusId === f.statusId) &&
      (!f.sourceId || l.sourceId === f.sourceId) &&
      (!f.subSourceId || l.subSourceId === f.subSourceId) &&
      (!f.departmentId || l.departmentId === f.departmentId) &&
      (!f.assignedTo || l.assignedTo === f.assignedTo) &&
      (fromTs === null || l.createdAt >= fromTs) &&
      (toTs === null || l.createdAt <= toTs) &&
      matchesLeadSearch(l, f.q),
  );
}

export type LeadSortKey = "createdAt" | "name" | "status" | "lastActivityAt";
export type SortDir = "asc" | "desc";

export function sortLeads(leads: Lead[], key: LeadSortKey, dir: SortDir, statuses: Record<string, LeadStatus>): Lead[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...leads].sort((a, b) => {
    switch (key) {
      case "name":
        return mul * a.name.localeCompare(b.name);
      case "status":
        return mul * ((statuses[a.statusId]?.order ?? 0) - (statuses[b.statusId]?.order ?? 0));
      case "lastActivityAt":
        return mul * ((a.lastActivityAt ?? 0) - (b.lastActivityAt ?? 0));
      default:
        return mul * ((a.createdAt ?? 0) - (b.createdAt ?? 0));
    }
  });
}
