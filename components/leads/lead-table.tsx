"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useCrmData } from "@/lib/database/crm-data-context";
import type { Lead } from "@/types";
import { formatDate, formatRelative } from "@/utils/format";
import { cn } from "@/utils/cn";
import { followUpState, type LeadSortKey, type SortDir } from "@/utils/leads";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./status-badge";
import { LeadRowActions } from "./lead-row-actions";
import type { LeadAction } from "./lead-action-dialogs";

type Props = {
  leads: Lead[];
  sortKey?: LeadSortKey;
  sortDir?: SortDir;
  onSort?: (key: LeadSortKey) => void;
  onAction?: (action: LeadAction, lead: Lead) => void;
  compact?: boolean;
};

function SortHeader({ label, k, sortKey, sortDir, onSort }: { label: string; k: LeadSortKey } & Pick<Props, "sortKey" | "sortDir" | "onSort">) {
  if (!onSort) return <>{label}</>;
  const active = sortKey === k;
  const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button type="button" onClick={() => onSort(k)} className="inline-flex items-center gap-1 uppercase tracking-[inherit] hover:text-slate-900">
      {label}
      <Icon className={active ? "h-3.5 w-3.5 text-brand-600" : "h-3.5 w-3.5 text-slate-300"} />
    </button>
  );
}

export function LeadTable({ leads, sortKey, sortDir, onSort, onAction, compact }: Props) {
  const { projects, statuses, sources, subSources, users, departments } = useCrmData();
  const router = useRouter();
  const th = "px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 whitespace-nowrap";
  const td = cn("px-5 text-[15px] text-slate-700 whitespace-nowrap", compact ? "py-3" : "py-4");

  return (
    <>
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-border">
          <thead>
            <tr>
              <th className={th}><SortHeader label="Lead" k="name" {...{ sortKey, sortDir, onSort }} /></th>
              <th className={th}>Phone</th>
              {!compact && <th className={th}>Email</th>}
              <th className={th}>Project</th>
              <th className={th}><SortHeader label="Status" k="status" {...{ sortKey, sortDir, onSort }} /></th>
              <th className={th}>Source</th>
              {!compact && <th className={th}>Sub-source</th>}
              <th className={th}>Assigned</th>
              {!compact && <th className={th}>Department</th>}
              <th className={th}><SortHeader label="Created" k="createdAt" {...{ sortKey, sortDir, onSort }} /></th>
              {!compact && <th className={th}><SortHeader label="Last activity" k="lastActivityAt" {...{ sortKey, sortDir, onSort }} /></th>}
              {onAction && <th className={th}><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {leads.map((lead) => {
              const fu = followUpState(lead, statuses.byId);
              return (
                <tr
                  key={lead.id}
                  className="cursor-pointer transition-colors hover:bg-slate-100/70"
                  onClick={() => router.push(`/leads/${lead.id}`)}
                >
                  <td className={td}>
                    <span className="flex items-center gap-3">
                      <Avatar name={lead.name} className={compact ? "h-8 w-8" : "h-10 w-10 text-[13px]"} />
                      <Link href={`/leads/${lead.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-slate-900 hover:text-brand-600">
                        {lead.name}
                      </Link>
                      {fu && (
                        <Badge tone={fu === "overdue" ? "red" : "amber"} className="px-2 text-[11px]">
                          {fu === "overdue" ? "Overdue" : "Due today"}
                        </Badge>
                      )}
                    </span>
                  </td>
                  <td className={cn(td, "tabular-nums text-slate-600")}>{lead.phone}</td>
                  {!compact && <td className={cn(td, "max-w-[240px] truncate text-slate-600")}>{lead.email}</td>}
                  <td className={td}>{projects.byId[lead.projectId]?.name ?? "—"}</td>
                  <td className={td}><StatusBadge status={statuses.byId[lead.statusId]} /></td>
                  <td className={td}>{sources.byId[lead.sourceId]?.name ?? "—"}</td>
                  {!compact && <td className={td}>{lead.subSourceId ? subSources.byId[lead.subSourceId]?.name ?? "—" : "—"}</td>}
                  <td className={td}>{users.byId[lead.assignedTo]?.fullName ?? "Unassigned"}</td>
                  {!compact && <td className={td}>{departments.byId[lead.departmentId]?.name ?? "—"}</td>}
                  <td className={td}>{formatDate(lead.createdAt)}</td>
                  {!compact && <td className={td} title={formatDate(lead.lastActivityAt)}>{formatRelative(lead.lastActivityAt)}</td>}
                  {onAction && (
                    <td className="px-2 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <LeadRowActions lead={lead} onAction={onAction} />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-border md:hidden">
        {leads.map((lead) => (
          <li key={lead.id} className="flex items-start gap-3 px-4 py-3.5">
            <Avatar name={lead.name} className="mt-0.5 h-10 w-10" />
            <Link href={`/leads/${lead.id}`} className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold text-slate-900">{lead.name}</p>
                <StatusBadge status={statuses.byId[lead.statusId]} />
              </div>
              <p className="mt-0.5 truncate text-sm text-slate-500">{lead.phone} · {lead.email}</p>
              <p className="mt-1 text-xs text-slate-500">
                {projects.byId[lead.projectId]?.name} · {sources.byId[lead.sourceId]?.name} · {users.byId[lead.assignedTo]?.fullName ?? "Unassigned"}
              </p>
            </Link>
            {onAction && <LeadRowActions lead={lead} onAction={onAction} />}
          </li>
        ))}
      </ul>
    </>
  );
}
